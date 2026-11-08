-- READ-ONLY verification in a fresh connection after transaction_test.psql exits.
SELECT submission_enabled,agreement_version,agreement_published_at FROM public.lx_share_submission_settings WHERE id=1;
SELECT has_function_privilege('authenticated','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE') AS authenticated_can_submit,has_function_privilege('anon','public.lx_submit_share_request(uuid,text,boolean,boolean,boolean)','EXECUTE') AS anon_can_submit;
SELECT count(*) AS synthetic_agreements FROM public.lx_share_agreement_versions WHERE version='DEVTEST_ONLY_V5_TX_20261108';
SELECT count(*) AS synthetic_points FROM public.lx_approved_collection_points WHERE id='11111111-1111-4111-8111-111111111115';
-- With bound UUIDs, assert both requests are still draft and neither has a bag.
-- Record sequence LAST_VALUE before/after for audit, never setval backwards.
