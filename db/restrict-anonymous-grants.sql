-- Supabase grants anon EXECUTE directly by default; apply after releases-2-6.sql.
revoke all on all functions in schema pathira_private from anon;
grant execute on function pathira_private.shared_document(uuid,text),pathira_private.record_event(uuid,text,uuid,text,text) to anon;
DO $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ensure_workspace','save_guide','delete_guide','publish_guide','comment_guide','revoke_share','invite_member','accept_invite','set_member','brand_workspace','assign_guide','complete_assignment') loop
  execute format('revoke all on function %s from anon',f.signature);
 end loop;
end $$;
