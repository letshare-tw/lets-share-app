-- DEV-01B REVIEW DRAFT ONLY. DO NOT RUN AGAINST lets-share-dev.
-- Requires separate isolated test database, approved published agreement and explicit approval.
-- Preflight checks, auth checks and consent validation are preserved.
BEGIN;
-- 1. One bag per submitted request (idempotency at database layer).
ALTER TABLE public.lx_share_bags
  ADD CONSTRAINT lx_share_bags_one_per_request UNIQUE (share_request_id);
-- 2. Sequence-backed, globally unique human-readable bag codes.
CREATE SEQUENCE IF NOT EXISTS public.lx_share_bag_code_seq;
REVOKE ALL ON SEQUENCE public.lx_share_bag_code_seq FROM PUBLIC, anon, authenticated;
-- 3. Preserve the five-argument RPC contract and UUID return value.
-- DEV-01C MUST add a stable delivery-task/bag association before dispatch.
CREATE OR REPLACE FUNCTION public.lx_submit_share_request(
 p_request_id uuid, p_agreement_version text,
 p_transfer_agreed boolean, p_no_return_agreed boolean, p_recycling_agreed boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_settings public.lx_share_submission_settings%ROWTYPE;
 v_check jsonb;
 v_result uuid;
 v_details public.lx_share_draft_details%ROWTYPE;
 v_declared_at timestamptz;
 v_pickup_location text;
 v_code text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION '請先登入會員'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_uid AND registration_completed_at IS NOT NULL)
 THEN RAISE EXCEPTION '請先完成會員註冊'; END IF;
 SELECT * INTO v_settings FROM public.lx_share_submission_settings WHERE id=1;
 IF NOT FOUND OR v_settings.submission_enabled IS DISTINCT FROM TRUE
  OR v_settings.agreement_version IS NULL OR v_settings.agreement_published_at IS NULL
 THEN RAISE EXCEPTION '分享協議尚未正式發布，暫不開放提交'; END IF;
 IF p_agreement_version IS DISTINCT FROM v_settings.agreement_version
 THEN RAISE EXCEPTION '協議版本不一致，請重新閱讀'; END IF;
 IF p_transfer_agreed IS DISTINCT FROM TRUE OR p_no_return_agreed IS DISTINCT FROM TRUE
  OR p_recycling_agreed IS DISTINCT FROM TRUE
 THEN RAISE EXCEPTION '請完整同意衣物分享協議'; END IF;
 -- Row lock serializes concurrent submissions of the same draft.
 PERFORM 1 FROM public.lx_share_requests
 WHERE id=p_request_id AND sharer_user_id=v_uid AND status='draft' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '找不到可提交的本人草稿'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.lx_share_service_consents c
  JOIN public.lx_share_agreement_versions a ON a.version=c.agreement_version
  WHERE c.user_id=v_uid AND c.agreement_version=v_settings.agreement_version
    AND a.published_at IS NOT NULL AND a.published_at<=now()
 ) THEN RAISE EXCEPTION '請先啟用分享服務並同意目前版本的協議'; END IF;
 v_check := public.lx_share_submission_preflight(p_request_id);
 IF (v_check->>'ready') IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION '分享資料尚未完成：%',coalesce(v_check->>'reason','請檢查資料'); END IF;
 -- Lock the details row so its location and photo cannot change during submission.
 SELECT * INTO STRICT v_details FROM public.lx_share_draft_details
 WHERE request_id=p_request_id AND user_id=v_uid FOR UPDATE;
 IF v_details.pickup_kind='collection_point' THEN
  SELECT p.address_text INTO v_pickup_location FROM public.lx_approved_collection_points p
  WHERE p.id=v_details.collection_point_id AND p.enabled AND p.approved_at IS NOT NULL;
 ELSE
  v_pickup_location:=v_details.pickup_address_snapshot;
 END IF;
 IF nullif(btrim(v_pickup_location),'') IS NULL THEN RAISE EXCEPTION '取件地址不完整'; END IF;
 v_declared_at := clock_timestamp();
 UPDATE public.lx_share_requests SET status='submitted',
  transfer_agreement_version=v_settings.agreement_version,
  transfer_agreed_at=v_declared_at,no_return_agreed=true,recycling_agreed=true,
  submitted_at=v_declared_at,updated_at=v_declared_at
 WHERE id=p_request_id AND sharer_user_id=v_uid AND status='draft'
 RETURNING id INTO v_result;
 IF v_result IS NULL THEN RAISE EXCEPTION '分享申請已處理，請勿重複提交'; END IF;
 v_code := 'LS-'||to_char(v_declared_at AT TIME ZONE 'Asia/Taipei','YYMMDD')
  ||'-'||(SELECT CASE WHEN length(n::text)<6 THEN lpad(n::text,6,'0') ELSE n::text END FROM (SELECT nextval('public.lx_share_bag_code_seq'::regclass) AS n) q);
 INSERT INTO public.lx_share_bags(
  share_request_id,bag_code,status,pickup_location,declared_at,pickup_deadline_at,
  pickup_kind,collection_point_id,placement_note,placement_photo_path,placement_confirmed_at
 ) VALUES(
  p_request_id,v_code,'pending_pickup',v_pickup_location,
  v_declared_at,v_declared_at+interval '48 hours',
  v_details.pickup_kind,v_details.collection_point_id,
  v_details.placement_note,v_details.placement_photo_path,v_declared_at
 );
 RETURN v_result;
END;
$function$;
-- Preserve existing EXECUTE grants: this is a replacement of the same signature.
COMMIT;
-- IMPORTANT: deployment is prohibited until approval; this file is a review artifact.
