-- DEV-01B / lets-share-test / V5 LOCAL SECURITY REVIEW DRAFT / DO NOT EXECUTE
-- TARGET ONLY: lets-share-test (rfwqcrvxyjhtmafnbuyy).
-- Source metadata: lets-share-dev (read-only system catalog queries).
-- RPCs: 5 source-derived active functions, 1 disabled legacy stub, DEV-01B submit RPC, 1 auth bootstrap trigger function.
-- Frontend compatibility: legacy-22.js writes lx_share_draft_details (confirmed).
-- lx_attach_my_draft_placement writes legacy lx_share_draft_placements
-- and is included ONLY for compatibility; do not use it as C09 save path.
-- Requires separate runtime validation before any deployment.
-- No data copy, no agreement publication, submission_enabled=false.
-- B7 PRECONDITIONS: empty target public objects, no duplicate Storage bucket,
-- trusted deployment owner, existing auth.users/storage.objects and pgcrypto/gen_random_uuid.
-- B6: Local delimiter/static lint only; NOT parsed or executed by PostgreSQL.
-- V5: Strict canonical UUID folder; existing frontend emits 1..8 base36 chars.
-- Policy accepts 1..8 chars, matching existing frontend without GitHub changes.
-- Future frontend can adopt fixed-width cryptographic random filenames separately.
-- Not tested on PostgreSQL; requires approval and separate deployment review.
BEGIN;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text, created_at timestamptz NOT NULL DEFAULT now(),
 full_name text, phone text, updated_at timestamptz,
 registration_completed_at timestamptz, home_address text,
 home_placement_note text, address_city text, address_district text,
 address_street text, address_detail text, address_latitude double precision,
 address_longitude double precision, address_geocode_status text
);
-- B1: Auth registration bootstrap. New accounts start unverified for app registration.
-- This trigger is restricted to the TEST project's auth.users table.
CREATE OR REPLACE FUNCTION public.lx_test_auth_profile_bootstrap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $bootstrap$
BEGIN
 INSERT INTO public.profiles(id,registration_completed_at)
 VALUES(NEW.id,NULL) ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END;
$bootstrap$;
REVOKE ALL ON FUNCTION public.lx_test_auth_profile_bootstrap() FROM PUBLIC, anon, authenticated;
-- Auth registration triggers must not grant EXECUTE to authenticated.
CREATE TRIGGER lx_test_auth_profile_bootstrap_after_insert
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.lx_test_auth_profile_bootstrap();
-- Registration completion is NOT exposed to clients. Test user approval must be
-- a separate, explicitly authorized administrator action, NOT part of this SQL.
-- Until then, registered Auth users can save login identity but create_share_draft
-- correctly rejects them as incomplete. No client can self-approve registration.
-- Bootstrap trigger executes with its privileged owner, NOT the client role.
-- Post-deploy test must confirm owner and that INSERT into public.profiles succeeds.

CREATE TABLE public.lx_share_agreement_versions (
 version text PRIMARY KEY, content text NOT NULL CHECK(length(content)>=100),
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lx_share_submission_settings (
 id integer PRIMARY KEY CHECK(id=1),
 submission_enabled boolean NOT NULL DEFAULT false,
 agreement_version text, agreement_published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lx_share_service_consents (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 agreement_version text NOT NULL REFERENCES public.lx_share_agreement_versions(version),
 agreed_at timestamptz NOT NULL DEFAULT now(),
 consent_method text NOT NULL DEFAULT 'explicit_service_activation',
 PRIMARY KEY(user_id,agreement_version)
);
CREATE TABLE public.lx_approved_collection_points (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, address_text text NOT NULL, placement_note text,
 enabled boolean NOT NULL DEFAULT false, approved_at timestamptz,
 CONSTRAINT lx_point_enabled_requires_approval CHECK(NOT enabled OR approved_at IS NOT NULL),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lx_share_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sharer_user_id uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','accepted','cancelled','closed')),
 transfer_agreement_version text,transfer_agreed_at timestamptz,
 no_return_agreed boolean NOT NULL DEFAULT false,
 recycling_agreed boolean NOT NULL DEFAULT false,
 submitted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lx_share_submission_consent_check CHECK(status='draft' OR (transfer_agreement_version IS NOT NULL AND transfer_agreed_at IS NOT NULL AND no_return_agreed=true AND recycling_agreed=true AND submitted_at IS NOT NULL))
);
CREATE UNIQUE INDEX lx_share_requests_one_draft_per_user ON public.lx_share_requests(sharer_user_id) WHERE status='draft';
CREATE TABLE public.lx_share_draft_details (
 request_id uuid PRIMARY KEY REFERENCES public.lx_share_requests(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 clothing_count integer NOT NULL DEFAULT 2 CHECK(clothing_count BETWEEN 2 AND 1000),
 pickup_kind text NOT NULL DEFAULT 'home' CHECK(pickup_kind IN ('home','collection_point')),
 pickup_address_snapshot text,
 collection_point_id uuid REFERENCES public.lx_approved_collection_points(id),
 CONSTRAINT lx_draft_details_pickup_check CHECK((pickup_kind='home' AND collection_point_id IS NULL) OR pickup_kind='collection_point'),
 placement_note text,placement_photo_path text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lx_share_draft_placements (
 request_id uuid PRIMARY KEY REFERENCES public.lx_share_requests(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 pickup_kind text NOT NULL CHECK(pickup_kind IN ('home','collection_point')),
 pickup_address_snapshot text NOT NULL,
 collection_point_id uuid REFERENCES public.lx_approved_collection_points(id),
 CONSTRAINT lx_draft_placement_kind CHECK((pickup_kind='home' AND collection_point_id IS NULL) OR (pickup_kind='collection_point' AND collection_point_id IS NOT NULL)),
 placement_photo_path text NOT NULL,
 placement_note text,
 placed_confirmed_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lx_share_bags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 share_request_id uuid NOT NULL REFERENCES public.lx_share_requests(id),
 bag_code text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending_pickup' CHECK(status IN ('pending_pickup','pickup_assigned','picked_up','delivered_to_artisan','inspection','completed','exception')),
 pickup_location text NOT NULL,
 declared_at timestamptz NOT NULL DEFAULT now(),
 pickup_deadline_at timestamptz NOT NULL,
 picked_up_at timestamptz,delivered_to_artisan_at timestamptz,
 rider_user_id uuid REFERENCES auth.users(id),
 artisan_user_id uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 pickup_kind text CHECK(pickup_kind IN ('home','collection_point')),
 collection_point_id uuid REFERENCES public.lx_approved_collection_points(id),
 placement_note text,placement_photo_path text,placement_confirmed_at timestamptz,
 CONSTRAINT lx_share_pickup_deadline_check CHECK(pickup_deadline_at=declared_at+interval '48 hours'),
 CONSTRAINT lx_share_bags_one_per_request UNIQUE(share_request_id)
);
CREATE INDEX idx_lx_share_requests_sharer ON public.lx_share_requests(sharer_user_id);
CREATE INDEX idx_lx_share_requests_status ON public.lx_share_requests(status);
-- UNIQUE(share_request_id) already creates a btree index; no duplicate index.
CREATE INDEX idx_lx_share_bags_pickup ON public.lx_share_bags(status,pickup_deadline_at);
CREATE SEQUENCE public.lx_share_bag_code_seq;
REVOKE ALL ON SEQUENCE public.lx_share_bag_code_seq FROM PUBLIC,anon,authenticated;
-- Restrict all exposed tables until exact source RLS and grants are verified.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_submission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_service_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_approved_collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_draft_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lx_share_draft_placements ENABLE ROW LEVEL SECURITY;
-- Avoid schema-wide revocation: only the nine newly created tables.
REVOKE ALL ON TABLE public.profiles, public.lx_share_agreement_versions,
 public.lx_share_submission_settings, public.lx_share_service_consents,
 public.lx_approved_collection_points, public.lx_share_requests,
 public.lx_share_draft_details, public.lx_share_draft_placements,
 public.lx_share_bags FROM PUBLIC, anon, authenticated;
-- SOURCE AUDIT: zero non-internal triggers on selected core tables.
-- BLOCKER: Validate RPC dependencies and grants before execution.
-- Storage source metadata and own-folder policies are reproduced in the companion review file.
-- BLOCKER: Test-only auth users must be created in test Auth, never copied from dev.
-- BLOCKER: Test-only published agreement and submission enablement must require
-- separate explicit authorization; do not enable here.
INSERT INTO public.lx_share_submission_settings(id,submission_enabled) VALUES(1,false);

-- Core source RLS + private storage policy
CREATE POLICY lx_points_read_enabled ON public.lx_approved_collection_points FOR SELECT TO authenticated
 USING(enabled=true AND approved_at IS NOT NULL);
CREATE POLICY lx_share_agreements_read_published ON public.lx_share_agreement_versions FOR SELECT TO authenticated
 USING(published_at IS NOT NULL AND published_at<=now());
CREATE POLICY lx_share_requests_select_own ON public.lx_share_requests FOR SELECT TO authenticated
 USING(sharer_user_id=(SELECT auth.uid()));
CREATE POLICY lx_share_consents_read_self ON public.lx_share_service_consents FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
CREATE POLICY lx_draft_placements_read_own ON public.lx_share_draft_placements FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
CREATE POLICY lx_draft_details_select_own ON public.lx_share_draft_details FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND EXISTS
  (SELECT 1 FROM public.lx_share_requests r WHERE r.id=request_id AND r.sharer_user_id=(SELECT auth.uid()) AND r.status='draft'));
CREATE POLICY lx_draft_details_insert_own ON public.lx_share_draft_details FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS
  (SELECT 1 FROM public.lx_share_requests r WHERE r.id=request_id AND r.sharer_user_id=(SELECT auth.uid()) AND r.status='draft'));
CREATE POLICY lx_draft_details_update_own ON public.lx_share_draft_details FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid()) AND EXISTS
  (SELECT 1 FROM public.lx_share_requests r WHERE r.id=request_id AND r.sharer_user_id=(SELECT auth.uid()) AND r.status='draft'))
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS
  (SELECT 1 FROM public.lx_share_requests r WHERE r.id=request_id AND r.sharer_user_id=(SELECT auth.uid()) AND r.status='draft'));
CREATE POLICY "Members can read own profile" ON public.profiles FOR SELECT TO authenticated
 USING((SELECT auth.uid())=id);
CREATE POLICY "Members can update own profile" ON public.profiles FOR UPDATE TO authenticated
 USING((SELECT auth.uid())=id) WITH CHECK((SELECT auth.uid())=id);
-- B5: No Storage DELETE or UPDATE policy: abandoned photos require
-- separately authorized admin cleanup via Storage API, never ad hoc SQL.
-- Source has no member-facing policy on lx_share_bags; use owner-filtered RPC.
-- Storage bucket: private; max 10485760 bytes; image/jpeg,image/png,image/webp.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('share-placement-photos','share-placement-photos',false,10485760,
 ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY lx_placement_photo_insert_own_folder ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(
 bucket_id='share-placement-photos'
 AND auth.uid() IS NOT NULL
 AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$')
 AND EXISTS (
  SELECT 1 FROM public.lx_share_requests r
  WHERE r.id::text=(storage.foldername(name))[2]
    AND r.sharer_user_id=(SELECT auth.uid()) AND r.status='draft'
 )
);
CREATE POLICY lx_placement_photo_read_own_folder ON storage.objects FOR SELECT TO authenticated
 USING(
 bucket_id='share-placement-photos'
 AND auth.uid() IS NOT NULL
 AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$')
 AND EXISTS (
  SELECT 1 FROM public.lx_share_requests r
  WHERE r.id::text=(storage.foldername(name))[2]
    AND r.sharer_user_id=(SELECT auth.uid())
 )
);

-- Source-derived RPCs

-- Source-derived RPC definitions (reviewed against pg_get_functiondef output).
CREATE OR REPLACE FUNCTION public.lx_create_share_draft()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_user_id uuid; v_request_id uuid;
BEGIN
 v_user_id := auth.uid();
 IF v_user_id IS NULL THEN RAISE EXCEPTION '請先登入會員帳號'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user_id AND registration_completed_at IS NOT NULL)
 THEN RAISE EXCEPTION '請先完成會員註冊'; END IF;
 INSERT INTO public.lx_share_requests(sharer_user_id,status) VALUES(v_user_id,'draft')
 ON CONFLICT (sharer_user_id) WHERE status='draft'
 DO UPDATE SET sharer_user_id=EXCLUDED.sharer_user_id RETURNING id INTO v_request_id;
 RETURN v_request_id;
END;
$function$;

-- B2: Legacy endpoint intentionally disabled in isolated test environment.
-- The actual C09 frontend writes lx_share_draft_details, not lx_share_draft_placements.
CREATE OR REPLACE FUNCTION public.lx_attach_my_draft_placement(
 p_request_id uuid,p_kind text,p_collection_point_id uuid,p_photo_path text,p_note text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $legacy$
BEGIN
 RAISE EXCEPTION 'Legacy placement RPC is disabled; use lx_share_draft_details';
END;
$legacy$;

CREATE OR REPLACE FUNCTION public.lx_share_service_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_ver text;v_content text;v_activated boolean;
begin
 if v_uid is null then raise exception '請先登入會員';end if;
 select s.agreement_version,a.content into v_ver,v_content
 from public.lx_share_submission_settings s
 join public.lx_share_agreement_versions a on a.version=s.agreement_version
 where s.id=1 and s.agreement_published_at is not null and a.published_at is not null and a.published_at<=now();
 if v_ver is null then return jsonb_build_object('published',false,'activated',false);end if;
 select exists(select 1 from public.lx_share_service_consents where user_id=v_uid and agreement_version=v_ver) into v_activated;
 return jsonb_build_object('published',true,'activated',v_activated,'version',v_ver,'content',v_content);
end $function$;

CREATE OR REPLACE FUNCTION public.lx_activate_share_service(p_agreement_version text,p_explicit_agreement boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid();v_version text;
begin
 if v_uid is null then raise exception '請先登入';end if;
 if p_explicit_agreement is distinct from true then raise exception '請閱讀並明確同意分享服務條款';end if;
 select a.version into v_version from public.lx_share_agreement_versions a join public.lx_share_submission_settings s on s.agreement_version=a.version and s.id=1
 where a.version=p_agreement_version and a.published_at is not null and a.published_at<=now() and s.agreement_published_at is not null;
 if v_version is null then raise exception '分享服務協議尚未正式發布';end if;
 if not exists(select 1 from public.profiles where id=v_uid and registration_completed_at is not null) then raise exception '請先完成會員註冊';end if;
 insert into public.lx_share_service_consents(user_id,agreement_version) values(v_uid,v_version) on conflict do nothing;
 return jsonb_build_object('activated',true,'agreement_version',v_version);
end $function$;

CREATE OR REPLACE FUNCTION public.lx_share_submission_preflight(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_request public.lx_share_requests%rowtype; v_detail public.lx_share_draft_details%rowtype; v_settings public.lx_share_submission_settings%rowtype; v_photo_ok boolean;
begin
 if v_uid is null then raise exception '請先登入會員'; end if;
 select * into v_request from public.lx_share_requests where id=p_request_id and sharer_user_id=v_uid;
 if not found then raise exception '找不到本人分享申請'; end if;
 if v_request.status <> 'draft' then return jsonb_build_object('ready',false,'reason','申請不是草稿狀態','status',v_request.status); end if;
 select * into v_detail from public.lx_share_draft_details where request_id=p_request_id and user_id=v_uid;
 if not found then return jsonb_build_object('ready',false,'reason','尚未儲存分享明細'); end if;
 if v_detail.clothing_count < 2 or v_detail.clothing_count > 1000 then return jsonb_build_object('ready',false,'reason','衣物件數不合規'); end if;
 if v_detail.pickup_kind='home' and (v_detail.pickup_address_snapshot is null or length(trim(v_detail.pickup_address_snapshot))<6) then return jsonb_build_object('ready',false,'reason','取件地址未完成'); end if;
 if v_detail.pickup_kind='collection_point' and (v_detail.collection_point_id is null or not exists(select 1 from public.lx_approved_collection_points p where p.id=v_detail.collection_point_id and p.enabled and p.approved_at is not null)) then return jsonb_build_object('ready',false,'reason','集貨點未核定'); end if;
 if v_detail.placement_photo_path is null or v_detail.placement_photo_path !~ ('^'||v_uid::text||'/'||p_request_id::text||'/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$') then return jsonb_build_object('ready',false,'reason','尚未儲存有效的放置位置照片'); end if;
 select exists(select 1 from storage.objects o where o.bucket_id='share-placement-photos' and o.name=v_detail.placement_photo_path) into v_photo_ok;
 if not v_photo_ok then return jsonb_build_object('ready',false,'reason','照片不存在於私有儲存空間'); end if;
 select * into v_settings from public.lx_share_submission_settings where id=1;
 if v_settings.submission_enabled is distinct from true or v_settings.agreement_version is null or v_settings.agreement_published_at is null or not exists(select 1 from public.lx_share_agreement_versions a where a.version=v_settings.agreement_version and a.published_at is not null and a.published_at<=now()) then return jsonb_build_object('ready',false,'reason','正式分享協議尚未發布','details_complete',true); end if;
 return jsonb_build_object('ready',true,'details_complete',true,'agreement_version',v_settings.agreement_version);
end $function$;

CREATE OR REPLACE FUNCTION public.lx_get_my_share_bags()
RETURNS TABLE(share_request_id uuid,bag_id uuid,bag_code text,bag_status text,declared_at timestamptz,pickup_deadline_at timestamptz,picked_up_at timestamptz,delivered_to_artisan_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 SELECT r.id,b.id,b.bag_code,b.status,b.declared_at,b.pickup_deadline_at,b.picked_up_at,b.delivered_to_artisan_at
 FROM public.lx_share_requests r JOIN public.lx_share_bags b ON b.share_request_id=r.id
 WHERE r.sharer_user_id=(SELECT auth.uid()) AND auth.uid() IS NOT NULL;
$function$;

-- DEV-01B replacement submit RPC

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
 PERFORM 1 FROM public.lx_share_requests
 WHERE id=p_request_id AND sharer_user_id=v_uid AND status='draft' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '找不到可提交的本人草稿'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.lx_share_service_consents c
  JOIN public.lx_share_agreement_versions a ON a.version=c.agreement_version
  WHERE c.user_id=v_uid AND c.agreement_version=v_settings.agreement_version
    AND a.published_at IS NOT NULL AND a.published_at<=now()
 ) THEN RAISE EXCEPTION '請先啟用分享服務並同意目前版本的協議'; END IF;
 SELECT * INTO STRICT v_details FROM public.lx_share_draft_details
 WHERE request_id=p_request_id AND user_id=v_uid FOR UPDATE;
 v_check := public.lx_share_submission_preflight(p_request_id);
 IF (v_check->>'ready') IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION '分享資料尚未完成：%',coalesce(v_check->>'reason','請檢查資料'); END IF;
 IF v_details.pickup_kind='collection_point' THEN
  SELECT p.address_text INTO v_pickup_location FROM public.lx_approved_collection_points p
  WHERE p.id=v_details.collection_point_id AND p.enabled AND p.approved_at IS NOT NULL
 FOR SHARE;
 ELSE
  v_pickup_location:=v_details.pickup_address_snapshot;
 END IF;
 IF v_details.pickup_kind NOT IN ('home','collection_point') OR v_details.pickup_kind IS NULL THEN RAISE EXCEPTION '取件類型不正確'; END IF;
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

-- IMPORTANT: auth.users trigger creation requires sufficient ownership/privilege on auth schema.
-- Confirm in target via separately authorized read-only preflight BEFORE deployment.
-- B3: Function owner must be a trusted admin role with required table access.
-- No GRANT to PUBLIC/anon. auth bootstrap trigger function also has no API grant.
-- Owner and BYPASSRLS behavior require POST-DEPLOY catalog verification.
-- Every API-callable SECURITY DEFINER function must check auth.uid() and ownership.
-- Explicit revokes include public/anon; default PUBLIC EXECUTE is not relied on.
-- Exact EXECUTE role model
REVOKE ALL ON FUNCTION public.lx_create_share_draft() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lx_create_share_draft() TO authenticated;
REVOKE ALL ON FUNCTION public.lx_attach_my_draft_placement(uuid,text,uuid,text,text) FROM PUBLIC, anon;
-- No EXECUTE grant: legacy RPC disabled.
REVOKE ALL ON FUNCTION public.lx_share_service_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lx_share_service_status() TO authenticated;
REVOKE ALL ON FUNCTION public.lx_activate_share_service(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lx_activate_share_service(text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.lx_share_submission_preflight(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lx_share_submission_preflight(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.lx_get_my_share_bags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lx_get_my_share_bags() TO authenticated;
-- V5: Defense in depth: do not expose submit RPC to members during setup.
-- Separate explicit approval is required before any later EXECUTE grant.
REVOKE ALL ON FUNCTION public.lx_submit_share_request(uuid,text,boolean,boolean,boolean) FROM PUBLIC, anon, authenticated;
-- Minimal API grants (verify frontend access)

GRANT SELECT ON public.profiles, public.lx_share_requests,
 public.lx_share_agreement_versions, public.lx_approved_collection_points,
 public.lx_share_service_consents, public.lx_share_draft_placements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lx_share_draft_details TO authenticated;
-- C09 legacy-22.js saves the last placement note to profiles using PATCH.
-- Column-level UPDATE avoids granting broad edits to other profile fields.
GRANT UPDATE (home_placement_note, home_address, address_city,
 address_district, address_street, address_detail) ON public.profiles TO authenticated;
-- registration_completed_at deliberately excluded from all client UPDATE grants.

COMMIT;
