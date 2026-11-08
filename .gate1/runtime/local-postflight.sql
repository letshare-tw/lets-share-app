DO $$ BEGIN
 IF (SELECT submission_enabled OR agreement_version IS NOT NULL OR agreement_published_at IS NOT NULL FROM public.lx_share_submission_settings WHERE id=1) THEN RAISE EXCEPTION 'local API gate not closed';END IF;
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM auth.sessions) OR EXISTS(SELECT 1 FROM auth.identities) OR EXISTS(SELECT 1 FROM auth.refresh_tokens) THEN RAISE EXCEPTION 'local Auth fixtures remain';END IF;
 IF EXISTS(SELECT 1 FROM storage.objects) OR EXISTS(SELECT 1 FROM public.profiles) OR EXISTS(SELECT 1 FROM public.lx_share_requests) OR EXISTS(SELECT 1 FROM public.lx_share_bags) OR EXISTS(SELECT 1 FROM public.lx_share_draft_details) OR EXISTS(SELECT 1 FROM public.lx_share_agreement_versions) OR EXISTS(SELECT 1 FROM public.lx_share_service_consents) OR EXISTS(SELECT 1 FROM public.lx_approved_collection_points) THEN RAISE EXCEPTION 'local API fixture rows remain';END IF;
 IF EXISTS(SELECT 1 FROM dev01b_test.resources WHERE state<>'deleted') OR EXISTS(SELECT 1 FROM dev01b_test.runs WHERE lease_owner IS NOT NULL) THEN RAISE EXCEPTION 'ledger resources or lease unreconciled';END IF;
 IF has_function_privilege('authenticated','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE') OR has_function_privilege('authenticated','public.gate1_internal_submit(uuid,uuid,text,boolean,boolean,boolean)','EXECUTE') THEN RAISE EXCEPTION 'member direct submit privilege exposed';END IF;
 UPDATE dev01b_test.runs SET phase='clean' WHERE run_id='dev01b-v5-0123456789abcdef';
 RAISE NOTICE 'PASS: new connection confirms real Auth, Storage, profile, request, bag cleanup and ledger reconciliation';
END $$;
SELECT last_value,is_called FROM public.lx_share_bag_code_seq;
SELECT phase,fencing_token,lease_owner FROM dev01b_test.runs;
