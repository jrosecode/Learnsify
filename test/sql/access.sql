\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.ensure_workspace() as workspace \gset
select public.save_guide(jsonb_build_object('id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','workspaceId',:'workspace','title','Private guide','steps','[{"id":"s1","title":"First"}]'::jsonb),0);
select public.publish_guide('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"title":"Published","steps":[]}','secret') as token \gset
select public.invite_member(:'workspace','viewer@example.com','viewer') as invite \gset
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.accept_invite(:'invite');
do $$begin if (select count(*) from public.guides)<>1 then raise exception 'viewer cannot read guide';end if;begin perform public.delete_guide('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');raise exception 'VIEWER_WRITE_ALLOWED';exception when others then if sqlerrm='VIEWER_WRITE_ALLOWED' then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$begin if (select count(*) from public.guides)<>0 then raise exception 'cross tenant read';end if;begin perform public.revoke_share('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');raise exception 'OUTSIDER_WRITE_ALLOWED';exception when others then if sqlerrm='OUTSIDER_WRITE_ALLOWED' then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$declare d jsonb;begin select body||jsonb_build_object('id',id,'workspaceId',workspace_id,'steps','[]'::jsonb) into d from public.guides limit 1;begin perform public.save_guide(d,0);raise exception 'CONFLICT_ALLOWED';exception when others then if sqlerrm not like 'REVISION_CONFLICT:%' then raise;end if;end;end$$;
set role anon;
select set_config('request.jwt.claim.sub','',false);
select set_config('test.token',:'token',false);
do $$begin begin perform public.shared_document(current_setting('test.token')::uuid,'wrong');raise exception 'PASSWORD_BYPASSED';exception when others then if sqlerrm='PASSWORD_BYPASSED' then raise;end if;end;if public.shared_document(current_setting('test.token')::uuid,'secret')->>'title'<>'Published' then raise exception 'share failed';end if;end$$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.revoke_share('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set role anon;
do $$begin begin perform public.shared_document(current_setting('test.token')::uuid,'secret');raise exception 'REVOCATION_FAILED';exception when others then if sqlerrm='REVOCATION_FAILED' then raise;end if;end;end$$;
