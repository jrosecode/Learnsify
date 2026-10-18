-- Additive reliability and collaboration upgrade. No guide content is removed.
alter table public.workspace_members drop constraint workspace_members_role_check;
alter table public.workspace_members add constraint workspace_members_role_check check(role in ('admin','editor','reviewer','viewer'));
alter table public.workspace_invites drop constraint workspace_invites_role_check;
alter table public.workspace_invites add constraint workspace_invites_role_check check(role in ('admin','editor','reviewer','viewer'));
alter table public.guides add column deleting_at timestamptz;
create table public.guide_deletions(guide_id uuid primary key,workspace_id uuid not null references public.workspaces on delete cascade,created_at timestamptz not null default now());
alter table public.guide_deletions enable row level security;
grant select on public.guide_deletions to authenticated;
revoke insert,update,delete on public.guide_deletions from authenticated,anon;
create policy read_deletions on public.guide_deletions for select to authenticated using(pathira_private.can_access(workspace_id));
create table public.guide_reviews(
 guide_id uuid references public.guides on delete cascade, revision integer not null,
 status text not null check(status in ('pending','approved','changes_requested')),
 requested_by uuid not null references auth.users, reviewed_by uuid references auth.users,
 note text not null default '' check(length(note)<=2000), updated_at timestamptz not null default now(),
 primary key(guide_id,revision)
);
create table public.workspace_audit(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,
 guide_id uuid,actor_id uuid,action text not null,revision integer,created_at timestamptz not null default now()
);
create index workspace_audit_scope on public.workspace_audit(workspace_id,created_at desc);
create index workspace_audit_guide on public.workspace_audit(guide_id,created_at desc);
alter table public.guide_reviews enable row level security;
alter table public.workspace_audit enable row level security;
grant select on public.guide_reviews,public.workspace_audit to authenticated;
revoke insert,update,delete on public.guide_reviews,public.workspace_audit from authenticated,anon;
create policy read_reviews on public.guide_reviews for select to authenticated using(pathira_private.can_guide(guide_id));
create policy read_audit on public.workspace_audit for select to authenticated using(pathira_private.can_access(workspace_id));
create function pathira_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare rowdata jsonb;w uuid;g uuid;r integer;begin
 rowdata:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if TG_TABLE_NAME='guides' then w:=(rowdata->>'workspace_id')::uuid;g:=(rowdata->>'id')::uuid;r:=(rowdata->>'revision')::integer;
 elsif TG_TABLE_NAME in ('workspace_members','workspace_invites') then w:=(rowdata->>'workspace_id')::uuid;
 elsif TG_TABLE_NAME='workspaces' then w:=(rowdata->>'id')::uuid;
 else g:=(rowdata->>'guide_id')::uuid;select workspace_id,revision into w,r from public.guides where id=g;end if;
 if w is not null then insert into public.workspace_audit(workspace_id,guide_id,actor_id,action,revision) values(w,g,auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),r);end if;
 return coalesce(new,old);end$$;
DO $$declare t text;begin foreach t in array array['guides','guide_reviews','guide_shares','workspace_members','workspace_invites','guide_comments','guide_assignments'] loop execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function pathira_private.audit_change()',t);end loop;end$$;
create function pathira_private.review_guide(g uuid,expected_revision integer,decision text,note text default '') returns void language plpgsql security definer set search_path='' as $$
 declare row public.guides;requester uuid;begin
 select * into row from public.guides where id=g for update;
 if not found or not pathira_private.can_access(row.workspace_id) then raise exception 'Guide access denied';end if;
 if row.deleting_at is not null then raise exception 'Guide deletion pending';end if;
 if row.revision<>expected_revision then raise exception 'REVISION_CONFLICT: Refresh the guide before review';end if;
 if decision='pending' then
  if not pathira_private.can_access(row.workspace_id,true) then raise exception 'Editor access required';end if;
  insert into public.guide_reviews(guide_id,revision,status,requested_by,note) values(g,expected_revision,'pending',auth.uid(),note)
  on conflict(guide_id,revision) do update set status='pending',requested_by=auth.uid(),reviewed_by=null,note=excluded.note,updated_at=now();
 elsif decision in ('approved','changes_requested') then
  if not pathira_private.is_admin(row.workspace_id) and not exists(select 1 from public.workspace_members where workspace_id=row.workspace_id and user_id=auth.uid() and role='reviewer') then raise exception 'Reviewer or admin access required';end if;
  select requested_by into requester from public.guide_reviews where guide_id=g and revision=expected_revision and status='pending';
  if requester is null then raise exception 'Submit this revision for review first';end if;
  if requester=auth.uid() then raise exception 'A different person must review this revision';end if;
  update public.guide_reviews set status=decision,reviewed_by=auth.uid(),note=review_guide.note,updated_at=now() where guide_id=g and revision=expected_revision;
 else raise exception 'Unknown review decision';end if;
 end$$;
create function public.review_guide(g uuid,expected_revision integer,decision text,note text default '') returns void language sql security invoker set search_path='' as $$select pathira_private.review_guide(g,expected_revision,decision,note)$$;
create function pathira_private.transfer_guide(g uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
 declare row public.guides;begin
 select * into row from public.guides where id=g for update;
 if not found or auth.uid() is null or not pathira_private.can_access(row.workspace_id,true) or (row.owner_id<>auth.uid() and not pathira_private.is_admin(row.workspace_id)) then raise exception 'Guide owner or admin required';end if;
 if row.deleting_at is not null then raise exception 'Guide deletion pending';end if;
 if not exists(select 1 from public.workspaces where id=row.workspace_id and owner_id=u) and not exists(select 1 from public.workspace_members where workspace_id=row.workspace_id and user_id=u and role in ('admin','editor')) then raise exception 'New owner must be a workspace editor or admin';end if;
 update public.guides set owner_id=u where id=g;
 end$$;
create function public.transfer_guide(g uuid,u uuid) returns void language sql security invoker set search_path='' as $$select pathira_private.transfer_guide(g,u)$$;
-- Deletion is a tombstone until all objects have been removed through the Storage API.
create function pathira_private.begin_delete_guide(g uuid,w uuid default null) returns void language plpgsql security definer set search_path='' as $$declare target uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 select workspace_id into target from public.guides where id=g;
 if target is null then select workspace_id into target from public.guide_deletions where guide_id=g;end if;
 target:=coalesce(target,w);
 if target is null or not pathira_private.can_access(target,true) then raise exception 'Editor access required';end if;
 insert into public.guide_deletions(guide_id,workspace_id) values(g,target) on conflict do nothing;
 update public.guides set deleting_at=coalesce(deleting_at,now()) where id=g;
 update public.guide_shares set enabled=false where guide_id=g;
 end$$;
create function public.begin_delete_guide(g uuid,w uuid default null) returns void language sql security invoker set search_path='' as $$select pathira_private.begin_delete_guide(g,w)$$;
create or replace function pathira_private.delete_guide(g uuid) returns void language plpgsql security definer set search_path='' as $$declare row public.guides;begin
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 select * into row from public.guides where id=g for update;
 if not found then
  if exists(select 1 from public.guide_deletions where guide_id=g and pathira_private.can_access(workspace_id,true)) then return;end if;
  raise exception 'Editor access required';
 end if;
 if not pathira_private.can_guide(g,true) then raise exception 'Editor access required';end if;
 if row.deleting_at is null then raise exception 'Begin deletion first';end if;
 if exists(select 1 from storage.objects where bucket_id='guide-assets' and name like row.workspace_id::text||'/'||g::text||'/%') then raise exception 'Media cleanup incomplete. Retry deletion.';end if;
 delete from public.guides where id=g;
 end$$;
-- Prevent a normal save from clearing the deletion tombstone.
create function pathira_private.guard_guide() returns trigger language plpgsql security definer set search_path='' as $$begin
 if TG_OP='INSERT' then if exists(select 1 from public.guide_deletions where guide_id=new.id) then raise exception 'Guide was deleted. Save a new copy.';end if;return new;end if;
 if old.deleting_at is not null and (new.body is distinct from old.body or new.revision<>old.revision or new.deleting_at is null) then raise exception 'Guide deletion pending';end if;
 return new;end$$;
create trigger guard_guide before insert or update on public.guides for each row execute function pathira_private.guard_guide();
create function pathira_private.guard_publication() returns trigger language plpgsql security definer set search_path='' as $$declare row public.guides;st jsonb;p jsonb;field text;assembled jsonb:='[]'::jsonb;begin
 select * into row from public.guides where id=new.guide_id for update;
 if new.enabled then
  if row.deleting_at is not null then raise exception 'Guide deletion pending';end if;
  if exists(select 1 from public.guide_reviews where guide_id=row.id) then
   if not exists(select 1 from public.guide_reviews where guide_id=row.id and revision=row.revision and status='approved') then raise exception 'The current revision requires approval before publication';end if;
   if (new.snapshot->>'revision')::integer is distinct from row.revision then raise exception 'Publish the approved cloud revision';end if;
   -- Rebuild reviewed content from stored data; accept only media matching its saved content hash.
   for st in select body from public.guide_steps where guide_id=row.id order by position loop
    select value into p from jsonb_array_elements(new.snapshot->'steps') where value->>'id'=st->>'id' limit 1;
    foreach field in array array['screenshot','audio','video'] loop
     if st->>(field||'Path') is not null then
      if p->>field is null or encode(extensions.digest(decode(split_part(p->>field,',',2),'base64'),'sha256'),'hex')<>split_part(st->>(field||'Path'),'/',3) then raise exception 'Publish media from the approved revision';end if;
      st:=st||jsonb_build_object(field,p->>field);
     end if;
     st:=st-(field||'Path');
    end loop;
    assembled:=assembled||jsonb_build_array(st-'original'-'imageHistory');
   end loop;
   new.snapshot:=row.body||jsonb_build_object('steps',assembled,'revision',row.revision,'branding',(select branding from public.workspaces where id=row.workspace_id));
  end if;
 end if;return new;end$$;
create trigger guard_publication before insert or update on public.guide_shares for each row execute function pathira_private.guard_publication();
create function pathira_private.asset_writable(object_name text) returns boolean language plpgsql stable security definer set search_path='' as $$declare w uuid;g uuid;begin
 w:=split_part(object_name,'/',1)::uuid;g:=split_part(object_name,'/',2)::uuid;
 return pathira_private.can_access(w,true) and not exists(select 1 from public.guide_deletions where guide_id=g) and not exists(select 1 from public.guides where id=g and (deleting_at is not null or workspace_id<>w));
 exception when invalid_text_representation then return false;end$$;
drop policy pathira_asset_insert on storage.objects;
create policy pathira_asset_insert on storage.objects for insert to authenticated with check(bucket_id='guide-assets' and pathira_private.asset_writable(name));
-- Explicit grants also override Supabase's default direct role grants.
DO $$declare f record;begin for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','pathira_private') and p.proname in ('review_guide','transfer_guide','begin_delete_guide','audit_change','guard_guide','guard_publication','asset_writable') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname in ('review_guide','transfer_guide','begin_delete_guide','asset_writable') then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end$$;
