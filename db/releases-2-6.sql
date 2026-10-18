-- Additive upgrade; legacy workflow_libraries remains available for rollback.
create schema if not exists pathira_private;
revoke all on schema pathira_private from public;
grant usage on schema pathira_private to authenticated, anon;
create table public.workspaces(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null default 'My workspace',branding jsonb not null default '{}',created_at timestamptz not null default now());
create unique index workspace_owner_personal on public.workspaces(owner_id);
create table public.workspace_members(workspace_id uuid references public.workspaces on delete cascade,user_id uuid references auth.users on delete cascade,role text not null check(role in ('admin','editor','viewer')),primary key(workspace_id,user_id));
create table public.workspace_invites(token uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,email text not null,role text not null check(role in ('editor','viewer','admin')),expires_at timestamptz not null default now()+interval '7 days');
create table public.guides(id uuid primary key,workspace_id uuid not null references public.workspaces on delete cascade,owner_id uuid not null references auth.users,revision integer not null default 1,body jsonb not null,updated_at timestamptz not null default now());
create index guides_workspace on public.guides(workspace_id);
create table public.guide_steps(guide_id uuid references public.guides on delete cascade,id text not null,position integer not null,body jsonb not null,primary key(guide_id,id));
create table public.guide_versions(guide_id uuid references public.guides on delete cascade,revision integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),primary key(guide_id,revision));
create table public.guide_shares(token uuid primary key default gen_random_uuid(),guide_id uuid unique not null references public.guides on delete cascade,snapshot jsonb not null,password_hash text,expires_at timestamptz,allowed_domain text,enabled boolean not null default true,updated_at timestamptz not null default now());
create table public.guide_comments(id uuid primary key default gen_random_uuid(),guide_id uuid not null references public.guides on delete cascade,user_id uuid not null references auth.users,step_id text,body text not null check(length(body) between 1 and 2000),kind text not null default 'comment' check(kind in ('comment','outdated')),created_at timestamptz not null default now());
create table public.guide_events(id uuid primary key default gen_random_uuid(),guide_id uuid not null references public.guides on delete cascade,session_id uuid not null,step_id text not null default '',kind text not null check(kind in ('view','step','complete')),created_at timestamptz not null default now(),unique(guide_id,session_id,step_id,kind));
create table public.guide_assignments(id uuid primary key default gen_random_uuid(),guide_id uuid not null references public.guides on delete cascade,assignee_id uuid not null references auth.users,due_at date,completed_at timestamptz,created_at timestamptz not null default now());
create index assignments_assignee on public.guide_assignments(assignee_id);
create or replace function pathira_private.can_access(w uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.workspaces where id=w and owner_id=auth.uid()) or exists(select 1 from public.workspace_members where workspace_id=w and user_id=auth.uid() and (not write_access or role in ('admin','editor')))); $$;
create or replace function pathira_private.is_admin(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.workspaces where id=w and owner_id=auth.uid()) or exists(select 1 from public.workspace_members where workspace_id=w and user_id=auth.uid() and role='admin')); $$;
create or replace function pathira_private.can_guide(g uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.guides where id=g and pathira_private.can_access(workspace_id,write_access)); $$;
DO $$ declare t text; begin foreach t in array array['workspaces','workspace_members','workspace_invites','guides','guide_steps','guide_versions','guide_shares','guide_comments','guide_events','guide_assignments'] loop execute format('alter table public.%I enable row level security',t);execute format('grant select on public.%I to authenticated',t);end loop;end $$;
create policy read_workspaces on public.workspaces for select to authenticated using(pathira_private.can_access(id));
create policy read_members on public.workspace_members for select to authenticated using(pathira_private.can_access(workspace_id));
create policy read_invites on public.workspace_invites for select to authenticated using(pathira_private.is_admin(workspace_id));
create policy read_guides on public.guides for select to authenticated using(pathira_private.can_access(workspace_id));
create policy read_steps on public.guide_steps for select to authenticated using(pathira_private.can_guide(guide_id));
create policy read_versions on public.guide_versions for select to authenticated using(pathira_private.can_guide(guide_id,true));
create policy read_shares on public.guide_shares for select to authenticated using(pathira_private.can_guide(guide_id,true));
create policy read_comments on public.guide_comments for select to authenticated using(pathira_private.can_guide(guide_id));
create policy read_events on public.guide_events for select to authenticated using(pathira_private.can_guide(guide_id,true));
create policy read_assignments on public.guide_assignments for select to authenticated using(assignee_id=auth.uid() or pathira_private.can_guide(guide_id,true));
create or replace function pathira_private.ensure_workspace() returns uuid language plpgsql security definer set search_path='' as $$ declare w uuid;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 insert into public.workspaces(owner_id) values(auth.uid()) on conflict(owner_id) do nothing;
 select id into w from public.workspaces where owner_id=auth.uid();return w;end $$;
create function public.ensure_workspace() returns uuid language sql security invoker set search_path='' as $$select pathira_private.ensure_workspace()$$;
create or replace function pathira_private.save_guide(document jsonb,expected_revision integer) returns integer language plpgsql security definer set search_path='' as $$
 declare g uuid:=(document->>'id')::uuid;w uuid:=(document->>'workspaceId')::uuid;old public.guides;next_revision integer;st jsonb;pos integer:=0;begin
 if not pathira_private.can_access(w,true) then raise exception 'Editor access required';end if;
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 select * into old from public.guides where id=g for update;
 if found then
  if old.workspace_id<>w or not pathira_private.can_guide(g,true) then raise exception 'Guide access denied';end if;
  if old.revision<>expected_revision then raise exception 'REVISION_CONFLICT: Another device changed this guide. Reload or save a copy.';end if;
  next_revision:=old.revision+1;
 else if expected_revision<>0 then raise exception 'Guide was deleted. Save a new copy.';end if;next_revision:=1;end if;
 if jsonb_typeof(document->'steps')<>'array' or jsonb_array_length(document->'steps')>1000 then raise exception 'Invalid steps';end if;
 insert into public.guides(id,workspace_id,owner_id,revision,body) values(g,w,auth.uid(),next_revision,document-'steps'-'revision') on conflict(id) do update set body=excluded.body,revision=excluded.revision,updated_at=now();
 delete from public.guide_steps where guide_id=g;
 for st in select value from jsonb_array_elements(document->'steps') loop insert into public.guide_steps values(g,st->>'id',pos,st);pos:=pos+1;end loop;
 insert into public.guide_versions(guide_id,revision,snapshot) values(g,next_revision,document||jsonb_build_object('revision',next_revision));
 return next_revision;end $$;
create function public.save_guide(document jsonb,expected_revision integer) returns integer language sql security invoker set search_path='' as $$select pathira_private.save_guide(document,expected_revision)$$;
create function pathira_private.delete_guide(g uuid) returns void language plpgsql security definer set search_path='' as $$begin if not pathira_private.can_guide(g,true) then raise exception 'Editor access required';end if;delete from public.guides where id=g;end$$;
create function public.delete_guide(g uuid) returns void language sql security invoker set search_path='' as $$select pathira_private.delete_guide(g)$$;
create function pathira_private.publish_guide(g uuid,snapshot jsonb,passphrase text default '',expiry timestamptz default null,domain text default null) returns uuid language plpgsql security definer set search_path='' as $$declare t uuid;begin
 if not pathira_private.can_guide(g,true) then raise exception 'Editor access required';end if;
 insert into public.guide_shares(guide_id,snapshot,password_hash,expires_at,allowed_domain) values(g,snapshot,case when passphrase<>'' then extensions.crypt(passphrase,extensions.gen_salt('bf')) end,expiry,nullif(lower(trim(domain)),'')) on conflict(guide_id) do update set snapshot=excluded.snapshot,password_hash=excluded.password_hash,expires_at=excluded.expires_at,allowed_domain=excluded.allowed_domain,enabled=true,updated_at=now() returning token into t;return t;end$$;
create function public.publish_guide(g uuid,snapshot jsonb,passphrase text default '',expiry timestamptz default null,domain text default null) returns uuid language sql security invoker set search_path='' as $$select pathira_private.publish_guide(g,snapshot,passphrase,expiry,domain)$$;
create function pathira_private.shared_document(t uuid,passphrase text default '') returns jsonb language plpgsql security definer set search_path='' as $$declare s public.guide_shares;email text;begin
 select * into s from public.guide_shares where token=t and enabled and (expires_at is null or expires_at>now());
 if not found then raise exception 'Guide unavailable or expired';end if;
 if s.password_hash is not null and extensions.crypt(passphrase,s.password_hash)<>s.password_hash then raise exception 'Password required or incorrect';end if;
 if s.allowed_domain is not null then
  if auth.uid() is null then raise exception 'Sign in with an approved email domain';end if;
  select u.email into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
  if email is null or lower(split_part(email,'@',2))<>s.allowed_domain then raise exception 'Verified email domain required';end if;
 end if;
 return s.snapshot;end$$;
create function public.shared_document(t uuid,passphrase text default '') returns jsonb language sql security invoker set search_path='' as $$select pathira_private.shared_document(t,passphrase)$$;
create function pathira_private.revoke_share(g uuid) returns void language plpgsql security definer set search_path='' as $$begin if not pathira_private.can_guide(g,true) then raise exception 'Editor access required';end if;update public.guide_shares set enabled=false where guide_id=g;end$$;
create function public.revoke_share(g uuid) returns void language sql security invoker set search_path='' as $$select pathira_private.revoke_share(g)$$;
create function pathira_private.record_event(t uuid,passphrase text,sid uuid,event_kind text,step text default '') returns void language plpgsql security definer set search_path='' as $$declare g uuid;begin
 perform pathira_private.shared_document(t,passphrase);select guide_id into g from public.guide_shares where token=t;
 if length(step)>150 then raise exception 'Invalid step';end if;
 insert into public.guide_events(guide_id,session_id,step_id,kind) values(g,sid,step,event_kind) on conflict do nothing;end$$;
create function public.record_event(t uuid,passphrase text,sid uuid,event_kind text,step text default '') returns void language sql security invoker set search_path='' as $$select pathira_private.record_event(t,passphrase,sid,event_kind,step)$$;
create function pathira_private.comment_guide(t uuid,passphrase text,message text,step text default '',report_kind text default 'comment') returns void language plpgsql security definer set search_path='' as $$declare g uuid;begin
 if auth.uid() is null then raise exception 'Sign in to comment';end if;perform pathira_private.shared_document(t,passphrase);select guide_id into g from public.guide_shares where token=t;
 insert into public.guide_comments(guide_id,user_id,step_id,body,kind) values(g,auth.uid(),step,message,report_kind);end$$;
create function public.comment_guide(t uuid,passphrase text,message text,step text default '',report_kind text default 'comment') returns void language sql security invoker set search_path='' as $$select pathira_private.comment_guide(t,passphrase,message,step,report_kind)$$;
create function pathira_private.invite_member(w uuid,email text,member_role text) returns uuid language plpgsql security definer set search_path='' as $$declare t uuid;begin
 if not pathira_private.is_admin(w) then raise exception 'Admin access required';end if;
 insert into public.workspace_invites(workspace_id,email,role) values(w,lower(trim(email)),member_role) returning token into t;return t;end$$;
create function public.invite_member(w uuid,email text,member_role text) returns uuid language sql security invoker set search_path='' as $$select pathira_private.invite_member(w,email,member_role)$$;
create function pathira_private.accept_invite(t uuid) returns uuid language plpgsql security definer set search_path='' as $$declare invite public.workspace_invites;email text;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into invite from public.workspace_invites where token=t and expires_at>now() for update;if not found then raise exception 'Invitation expired';end if;
 select u.email into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 if email is null or lower(email)<>invite.email then raise exception 'Sign in with the verified invited email';end if;
 insert into public.workspace_members values(invite.workspace_id,auth.uid(),invite.role) on conflict(workspace_id,user_id) do update set role=excluded.role;
 delete from public.workspace_invites where token=t;return invite.workspace_id;end$$;
create function public.accept_invite(t uuid) returns uuid language sql security invoker set search_path='' as $$select pathira_private.accept_invite(t)$$;
create function pathira_private.set_member(w uuid,u uuid,member_role text) returns void language plpgsql security definer set search_path='' as $$begin
 if not pathira_private.is_admin(w) then raise exception 'Admin access required';end if;
 if member_role='remove' then delete from public.workspace_members where workspace_id=w and user_id=u;else update public.workspace_members set role=member_role where workspace_id=w and user_id=u;end if;end$$;
create function public.set_member(w uuid,u uuid,member_role text) returns void language sql security invoker set search_path='' as $$select pathira_private.set_member(w,u,member_role)$$;
create function pathira_private.brand_workspace(w uuid,brand jsonb) returns void language plpgsql security definer set search_path='' as $$begin if not pathira_private.is_admin(w) then raise exception 'Admin access required';end if;update public.workspaces set branding=brand where id=w;end$$;
create function public.brand_workspace(w uuid,brand jsonb) returns void language sql security invoker set search_path='' as $$select pathira_private.brand_workspace(w,brand)$$;
create function pathira_private.assign_guide(g uuid,u uuid,due date) returns void language plpgsql security definer set search_path='' as $$declare w uuid;begin
 if not pathira_private.can_guide(g,true) then raise exception 'Editor access required';end if;
 select workspace_id into w from public.guides where id=g;
 if not exists(select 1 from public.workspace_members where workspace_id=w and user_id=u) and not exists(select 1 from public.workspaces where id=w and owner_id=u) then raise exception 'Assignee must belong to workspace';end if;
 insert into public.guide_assignments(guide_id,assignee_id,due_at) values(g,u,due);end$$;
create function public.assign_guide(g uuid,u uuid,due date) returns void language sql security invoker set search_path='' as $$select pathira_private.assign_guide(g,u,due)$$;
create function pathira_private.complete_assignment(a uuid) returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'Sign in required';end if;update public.guide_assignments set completed_at=now() where id=a and assignee_id=auth.uid();end$$;
create function public.complete_assignment(a uuid) returns void language sql security invoker set search_path='' as $$select pathira_private.complete_assignment(a)$$;
revoke all on all functions in schema pathira_private from public;
grant execute on all functions in schema pathira_private to authenticated;
grant execute on function pathira_private.shared_document(uuid,text),pathira_private.record_event(uuid,text,uuid,text,text) to anon;
-- Public wrappers are invokers; private implementations check identity and scope.
DO $$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ensure_workspace','save_guide','delete_guide','publish_guide','shared_document','record_event','comment_guide','revoke_share','invite_member','accept_invite','set_member','brand_workspace','assign_guide','complete_assignment') loop execute format('revoke all on function %s from public',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end$$;
grant execute on function public.shared_document(uuid,text),public.record_event(uuid,text,uuid,text,text) to anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('guide-assets','guide-assets',false,20971520,array['image/png','image/jpeg','image/webp','audio/webm','video/webm','audio/mp4','video/mp4']) on conflict(id) do nothing;
create policy pathira_asset_read on storage.objects for select to authenticated using(bucket_id='guide-assets' and pathira_private.can_access(((storage.foldername(name))[1])::uuid));
create policy pathira_asset_insert on storage.objects for insert to authenticated with check(bucket_id='guide-assets' and pathira_private.can_access(((storage.foldername(name))[1])::uuid,true));
create policy pathira_asset_delete on storage.objects for delete to authenticated using(bucket_id='guide-assets' and pathira_private.can_access(((storage.foldername(name))[1])::uuid,true));
