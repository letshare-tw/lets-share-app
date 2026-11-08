from pathlib import Path
import json,uuid
root=Path('.gate1-artifacts');root.mkdir(exist_ok=True)
setup={'status':'FIXTURE_MUST_BE_VERIFIED_AT_RUNTIME','run':'c19a7e1000000001','fixtures':[
 {'label':'a','user_id':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','request_id':'11111111-1111-4111-8111-111111111111','photo_path':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/12345678-a.png'},
 {'label':'b','user_id':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request_id':'22222222-2222-4222-8222-222222222223','photo_path':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/22222222-2222-4222-8222-222222222223/12345678-b.png'}]}
run=setup['run'];fixtures={x['label']:x for x in setup['fixtures']}
tests=[];sql=["BEGIN; SET LOCAL statement_timeout='45s'; SET LOCAL lock_timeout='5s';"]
def lit(x):return "'"+str(x).replace("'","''")+"'"
def raw(s):sql.append(s)
def role(name,user='a'):
 raw('RESET ROLE;')
 raw("SELECT set_config('request.jwt.claim.sub',"+lit(fixtures[user]['user_id'] if user else '')+",true);")
 raw('SET LOCAL ROLE '+name+';')
def check(name,statement,state='00000',message=None,category='submit'):
 tests.append({'name':name,'category':category,'expected_sqlstate':state,'message_contains':message})
 contains='true' if message is None else 'strpos(v_message,'+lit(message)+')>0'
 raw(f'''DO $case$
DECLARE v_ok boolean:=false;v_code text:='00000';v_message text:='';
BEGIN
 BEGIN
 {statement}
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_code=RETURNED_SQLSTATE,v_message=MESSAGE_TEXT;
 END;
 PERFORM set_config('lx.submit_case_{len(tests)}',jsonb_build_object(
 'name',{lit(name)},'category',{lit(category)},'role',current_user,
 'status',CASE WHEN v_code='{state}' AND ({contains}) AND (v_code<>'00000' OR v_ok IS TRUE) THEN 'PASS' ELSE 'FAIL' END,
 'expected_sqlstate','{state}','actual_sqlstate',v_code,'message',v_message,'assertion',v_ok)::text,true);
END $case$;''')
def boolean(name,expr,**kw):check(name,'SELECT ('+expr+') INTO v_ok;',**kw)
def error(name,statement,state='P0001',message=None,**kw):check(name,statement+';v_ok:=true;',state,message,**kw)
def req(who):return lit(fixtures[who]['request_id'])+'::uuid'
def uid(who):return lit(fixtures[who]['user_id'])+'::uuid'
version='DEVTEST_ONLY_'+run
def submit(who='a',ver=None,flags='true,true,true'):
 return 'public.lx_submit_share_request('+req(who)+','+lit(ver or version)+','+flags+')'

raw("SELECT set_config('application_name',"+lit('lx_v5_submit_'+run)+",true);")
raw("SELECT set_config('lx.test_backend_pid',pg_backend_pid()::text,true);")
raw("SELECT set_config('lx.seq_before',(SELECT jsonb_build_object('last_value',last_value,'is_called',is_called)::text FROM public.lx_share_bag_code_seq),true);")
raw(f'''DO $guard$
BEGIN
 IF current_setting('server_version_num')::integer<>170011 THEN RAISE EXCEPTION 'Expected PostgreSQL 17.11';END IF;
 IF (SELECT submission_enabled FROM public.lx_share_submission_settings WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Expected closed submission';END IF;
 IF (SELECT count(*) FROM auth.users)<>2 OR (SELECT count(*) FROM auth.users WHERE raw_app_meta_data->>'lx_validation_run'={lit(run)})<>2 THEN RAISE EXCEPTION 'Unexpected users: STOP';END IF;
 IF (SELECT count(*) FROM public.lx_share_requests)<>2 OR EXISTS(SELECT 1 FROM public.lx_share_requests WHERE status<>'draft') THEN RAISE EXCEPTION 'Unexpected request baseline';END IF;
 IF EXISTS(SELECT 1 FROM public.lx_share_bags) THEN RAISE EXCEPTION 'Expected zero bags';END IF;
 IF (SELECT count(*) FROM storage.objects)<>2 THEN RAISE EXCEPTION 'Unexpected Storage baseline';END IF;
 IF has_function_privilege('authenticated','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Member submit must remain revoked';END IF;
END $guard$;''')
raw('SELECT id FROM public.lx_share_submission_settings WHERE id=1 FOR UPDATE;')
raw(f"INSERT INTO public.lx_share_agreement_versions(version,content,published_at) VALUES ({lit(version)},repeat('DEVTEST_ONLY 虛構測試協議，非正式法律文件。',20),transaction_timestamp());")
raw(f"UPDATE public.lx_share_submission_settings SET submission_enabled=true,agreement_version={lit(version)},agreement_published_at=transaction_timestamp() WHERE id=1;")
boolean('inside_transaction_submission_true',f"(SELECT submission_enabled AND agreement_version={lit(version)} FROM public.lx_share_submission_settings WHERE id=1)",category='isolation')
# No remote connection; an independent postflight runs after psql exits.
role('authenticated','a')
error('member_submit_still_revoked_when_flag_true','PERFORM '+submit(),state='42501',category='ACL')
role('anon',None)
error('anon_submit_still_revoked_when_flag_true','PERFORM '+submit(),state='42501',category='ACL')
role('authenticated','a')
boolean('published_test_service_not_yet_activated',"public.lx_share_service_status()->>'published'='true' AND public.lx_share_service_status()->>'activated'='false'",category='agreement')
error('activation_requires_explicit_true',f"PERFORM public.lx_activate_share_service({lit(version)},false)",message='請閱讀並明確同意',category='agreement')
boolean('activate_a_published_fixture',f"public.lx_activate_share_service({lit(version)},true)->>'activated'='true'",category='agreement')
boolean('activation_idempotent_a',f"public.lx_activate_share_service({lit(version)},true)->>'activated'='true' AND (SELECT count(*)=1 FROM public.lx_share_service_consents WHERE user_id=auth.uid() AND agreement_version={lit(version)})",category='agreement')
boolean('service_status_a_activated',f"public.lx_share_service_status()->>'activated'='true' AND public.lx_share_service_status()->>'version'={lit(version)}",category='agreement')
boolean('preflight_a_ready_true',f"public.lx_share_submission_preflight({req('a')})->>'ready'='true'",category='preflight')
role('postgres','a')
error('submit_wrong_version_rejected','PERFORM '+submit(ver='wrong-fixture-version'),message='協議版本不一致')
for flags,label in [('false,true,true','transfer_false'),('true,false,true','no_return_false'),('true,true,false','recycling_false'),('NULL,true,true','transfer_null')]:
 error('submit_'+label+'_rejected','PERFORM '+submit(flags=flags),message='請完整同意衣物分享協議')
error('a_cannot_submit_b_request','PERFORM '+submit('b'),message='找不到可提交的本人草稿')
error('submit_temporarily_disabled_rejected','UPDATE public.lx_share_submission_settings SET submission_enabled=false WHERE id=1;PERFORM '+submit(),message='分享協議尚未正式發布')
role('postgres',None)
error('submit_null_uid_rejected','PERFORM '+submit(),message='請先登入會員')
raw("SELECT set_config('request.jwt.claim.sub',"+lit(str(uuid.uuid4()))+",true);")
error('submit_unregistered_uid_rejected','PERFORM '+submit(),message='請先完成會員註冊')
role('postgres','b')
error('b_without_service_activation_rejected','PERFORM '+submit('b'),message='請先啟用分享服務')
role('authenticated','b')
boolean('activate_b_published_fixture',f"public.lx_activate_share_service({lit(version)},true)->>'activated'='true'",category='agreement')
role('postgres','b')
error('submit_missing_detail_rejected',f"DELETE FROM public.lx_share_draft_details WHERE request_id={req('b')};PERFORM {submit('b')}",state='P0002',message='query returned no rows')
error('submit_short_home_address_rejected',f"UPDATE public.lx_share_draft_details SET pickup_address_snapshot='短' WHERE request_id={req('b')};PERFORM {submit('b')}",message='取件地址未完成')
error('submit_invalid_photo_path_rejected',f"UPDATE public.lx_share_draft_details SET placement_photo_path='invalid' WHERE request_id={req('b')};PERFORM {submit('b')}",message='尚未儲存有效的放置位置照片')
missing=fixtures['b']['user_id']+'/'+fixtures['b']['request_id']+'/123-missing.jpg'
error('submit_missing_object_rejected',f"UPDATE public.lx_share_draft_details SET placement_photo_path={lit(missing)} WHERE request_id={req('b')};PERFORM {submit('b')}",message='照片不存在於私有儲存空間')
error('collection_null_point_rejected',f"UPDATE public.lx_share_draft_details SET pickup_kind='collection_point',collection_point_id=NULL WHERE request_id={req('b')};PERFORM {submit('b')}",message='集貨點未核定')
boolean('rejected_calls_leave_original_drafts',"(SELECT count(*)=2 AND bool_and(status='draft' AND submitted_at IS NULL) FROM public.lx_share_requests) AND NOT EXISTS(SELECT 1 FROM public.lx_share_bags)",category='atomicity')
boolean('early_rejections_do_not_consume_sequence',"(SELECT jsonb_build_object('last_value',last_value,'is_called',is_called)::text=current_setting('lx.seq_before') FROM public.lx_share_bag_code_seq)",category='sequence')

role('postgres','a')
boolean('home_submit_returns_original_request',submit()+ '='+req('a'))
boolean('home_request_records_consent',f"(SELECT status='submitted' AND transfer_agreement_version={lit(version)} AND no_return_agreed AND recycling_agreed AND transfer_agreed_at=submitted_at AND updated_at=submitted_at FROM public.lx_share_requests WHERE id={req('a')})")
boolean('home_exactly_one_correct_bag',f"(SELECT count(*)=1 AND bool_and(pickup_kind='home' AND collection_point_id IS NULL AND pickup_location='合成提交測試住址（非真實地點）' AND placement_note='DEVTEST_ONLY placement a' AND placement_photo_path={lit(fixtures['a']['photo_path'])} AND status='pending_pickup') FROM public.lx_share_bags WHERE share_request_id={req('a')})")
boolean('home_bag_timestamps_consistent',f"(SELECT b.declared_at=r.submitted_at AND b.placement_confirmed_at=b.declared_at AND b.pickup_deadline_at=b.declared_at+interval '48 hours' AND extract(epoch FROM b.pickup_deadline_at-b.declared_at)=172800 FROM public.lx_share_bags b JOIN public.lx_share_requests r ON r.id=b.share_request_id WHERE r.id={req('a')})")
boolean('home_bag_code_taipei_date_and_sequence',f"(SELECT bag_code ~ '^LS-[0-9]{{6}}-[0-9]{{6,}}$' AND split_part(bag_code,'-',2)=to_char(declared_at AT TIME ZONE 'Asia/Taipei','YYMMDD') AND split_part(bag_code,'-',3)::bigint=(SELECT last_value FROM public.lx_share_bag_code_seq) FROM public.lx_share_bags WHERE share_request_id={req('a')})",category='sequence')
raw("SELECT set_config('lx.seq_after_home',(SELECT last_value::text FROM public.lx_share_bag_code_seq),true);")
error('repeat_home_submit_rejected','PERFORM '+submit(),message='找不到可提交的本人草稿')
boolean('repeat_submit_no_second_bag_or_sequence',f"(SELECT count(*)=1 FROM public.lx_share_bags WHERE share_request_id={req('a')}) AND (SELECT last_value::text=current_setting('lx.seq_after_home') FROM public.lx_share_bag_code_seq)",category='sequence')
role('authenticated','a')
boolean('submitted_details_not_visible',f"NOT EXISTS(SELECT 1 FROM public.lx_share_draft_details WHERE request_id={req('a')})",category='RLS')
check('submitted_details_not_updatable',f"DECLARE n integer;BEGIN UPDATE public.lx_share_draft_details SET placement_note='forbidden' WHERE request_id={req('a')};GET DIAGNOSTICS n=ROW_COUNT;v_ok:=n=0;END;",category='RLS')
boolean('a_sees_only_own_submitted_bag',f"(SELECT count(*)=1 AND bool_and(share_request_id={req('a')}) FROM public.lx_get_my_share_bags())",category='RLS')
boolean('new_draft_allowed_after_home_submit',f"public.lx_create_share_draft()<>{req('a')}",category='draft')

role('postgres','b')
check('prepare_transaction_only_approved_point',"DECLARE p uuid;BEGIN INSERT INTO public.lx_approved_collection_points(name,address_text,placement_note,enabled,approved_at) VALUES ('DEVTEST_ONLY approved point','合成核定集貨點地址（非真實地點）','fixture point note',true,now()) RETURNING id INTO p;PERFORM set_config('lx.point_id',p::text,true);v_ok:=true;END;",category='collection')
raw(f"UPDATE public.lx_share_draft_details SET pickup_kind='collection_point',collection_point_id=current_setting('lx.point_id')::uuid,pickup_address_snapshot=NULL WHERE request_id={req('b')};")
error('disabled_collection_point_rejected',"UPDATE public.lx_approved_collection_points SET enabled=false WHERE id=current_setting('lx.point_id')::uuid;PERFORM "+submit('b'),message='集貨點未核定',category='collection')
error('blank_approved_point_address_rejected',"UPDATE public.lx_approved_collection_points SET address_text='   ' WHERE id=current_setting('lx.point_id')::uuid;PERFORM "+submit('b'),message='取件地址不完整',category='collection')
boolean('collection_preflight_ready_true',f"public.lx_share_submission_preflight({req('b')})->>'ready'='true'",category='preflight')
raw("SELECT set_config('lx.seq_before_insert_failure',(SELECT last_value::text FROM public.lx_share_bag_code_seq),true);")
collision=f"INSERT INTO public.lx_share_bags(share_request_id,bag_code,pickup_location,declared_at,pickup_deadline_at) VALUES ({req('b')},{lit('DEVTEST_ONLY-collision-'+run)},'fixture',transaction_timestamp(),transaction_timestamp()+interval '48 hours');PERFORM {submit('b')}"
error('submit_bag_insert_failure_is_atomic',collision,state='23505',message='lx_share_bags_one_per_request',category='atomicity')
boolean('insert_failure_restores_b_draft_and_bag_count',f"(SELECT status='draft' AND submitted_at IS NULL AND transfer_agreement_version IS NULL FROM public.lx_share_requests WHERE id={req('b')}) AND NOT EXISTS(SELECT 1 FROM public.lx_share_bags WHERE share_request_id={req('b')})",category='atomicity')
boolean('insert_failure_consumes_sequence_without_rewind',"(SELECT is_called AND last_value=current_setting('lx.seq_before_insert_failure')::bigint+1 FROM public.lx_share_bag_code_seq)",category='sequence')
boolean('collection_submit_returns_original_request',submit('b')+'='+req('b'),category='collection')
boolean('collection_bag_uses_approved_point_address',f"(SELECT count(*)=1 AND bool_and(pickup_kind='collection_point' AND collection_point_id=current_setting('lx.point_id')::uuid AND pickup_location='合成核定集貨點地址（非真實地點）' AND placement_photo_path={lit(fixtures['b']['photo_path'])} AND placement_note='DEVTEST_ONLY placement b' AND status='pending_pickup') FROM public.lx_share_bags WHERE share_request_id={req('b')})",category='collection')
boolean('collection_bag_48h_and_consent_recorded',f"(SELECT b.pickup_deadline_at=b.declared_at+interval '48 hours' AND r.transfer_agreement_version={lit(version)} AND r.submitted_at=b.declared_at AND r.no_return_agreed AND r.recycling_agreed FROM public.lx_share_bags b JOIN public.lx_share_requests r ON r.id=b.share_request_id WHERE r.id={req('b')})",category='collection')
boolean('sequence_gap_visible_after_forced_failure',"(SELECT last_value=current_setting('lx.seq_before_insert_failure')::bigint+2 FROM public.lx_share_bag_code_seq)",category='sequence')
error('repeat_collection_submit_rejected','PERFORM '+submit('b'),message='找不到可提交的本人草稿',category='collection')
role('authenticated','b')
boolean('b_sees_only_own_collection_bag',f"(SELECT count(*)=1 AND bool_and(share_request_id={req('b')}) FROM public.lx_get_my_share_bags())",category='RLS')
boolean('b_cannot_read_a_consent',f"NOT EXISTS(SELECT 1 FROM public.lx_share_service_consents WHERE user_id={uid('a')})",category='RLS')
error('member_submit_permission_never_added','PERFORM '+submit('b'),state='42501',category='ACL')
role('postgres',None)
boolean('only_two_submitted_requests_and_bags',"(SELECT count(*)=2 FROM public.lx_share_requests WHERE status='submitted') AND (SELECT count(*)=2 FROM public.lx_share_bags)",category='final')
boolean('member_submit_acl_still_false',"NOT has_function_privilege('authenticated','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE') AND NOT has_function_privilege('anon','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE')",category='ACL')
raw("DO $strict$ DECLARE i integer;v jsonb; BEGIN FOR i IN 1.."+str(len(tests))+" LOOP v:=current_setting('lx.submit_case_'||i)::jsonb;IF v->>'status'<>'PASS' THEN RAISE EXCEPTION 'strict test failed: %',v;END IF;END LOOP;RAISE NOTICE 'PASS: all % strict SQLSTATE and state assertions',"+str(len(tests))+";END $strict$;")
vals=','.join("(current_setting('lx.submit_case_"+str(i)+"')::jsonb)" for i in range(1,len(tests)+1))
raw("SELECT jsonb_build_object('tests',(SELECT jsonb_agg(t.result) FROM (VALUES "+vals+") AS t(result)), 'backend_pid',current_setting('lx.test_backend_pid')::integer,'application_name',current_setting('application_name'),'sequence_before',current_setting('lx.seq_before')::jsonb,'sequence_after',(SELECT jsonb_build_object('last_value',last_value,'is_called',is_called) FROM public.lx_share_bag_code_seq),'inside_counts',jsonb_build_object('submitted_requests',(SELECT count(*) FROM public.lx_share_requests WHERE status='submitted'),'bags',(SELECT count(*) FROM public.lx_share_bags),'consents',(SELECT count(*) FROM public.lx_share_service_consents)),'inside_settings',(SELECT to_jsonb(s) FROM public.lx_share_submission_settings s WHERE id=1)) AS submission_validation;")
raw('ROLLBACK;')
(root/'strict-transaction.psql').write_text('\n\n'.join(sql)+'\n')
(root/'submission-case-manifest.json').write_text(json.dumps({'run':run,'version':version,'tests':tests},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'cases':len(tests),'bytes':(root/'strict-transaction.psql').stat().st_size,'run':run}))
