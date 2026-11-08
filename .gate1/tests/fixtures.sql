-- Synthetic fixture for a fresh disposable PG17 mock database only.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM public.lx_share_requests)
 OR EXISTS(SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'fixture database not empty';END IF;
END $$;
INSERT INTO auth.users(id,email) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','gate1-a@example.invalid'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','gate1-b@example.invalid');
SELECT gate1_checks.ok('auth bootstrap creates exactly two unapproved profiles',
 (SELECT count(*)=2 AND bool_and(registration_completed_at IS NULL) FROM public.profiles));
UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('lx_validation_run','c19a7e1000000001');
UPDATE public.profiles SET registration_completed_at=now();
INSERT INTO public.lx_share_requests(id,sharer_user_id) VALUES
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('22222222-2222-4222-8222-222222222223','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES
('share-placement-photos','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/12345678-a.png','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('share-placement-photos','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/22222222-2222-4222-8222-222222222223/12345678-b.png','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.lx_share_draft_details(request_id,user_id,pickup_address_snapshot,placement_photo_path,placement_note) VALUES
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','合成提交測試住址（非真實地點）','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/12345678-a.png','DEVTEST_ONLY placement a'),
('22222222-2222-4222-8222-222222222223','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','合成提交測試住址（非真實地點）','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/22222222-2222-4222-8222-222222222223/12345678-b.png','DEVTEST_ONLY placement b');
