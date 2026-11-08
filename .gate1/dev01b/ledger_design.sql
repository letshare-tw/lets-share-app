-- REVIEW ONLY: do not execute without separate approval. Test project ONLY.
-- DB ledger provides transactional claim + durable operation intent, not atomicity with external Auth/Storage.
CREATE SCHEMA dev01b_test;
REVOKE ALL ON SCHEMA dev01b_test FROM PUBLIC, anon, authenticated;
CREATE TABLE dev01b_test.runs (
 run_id text PRIMARY KEY CHECK (run_id ~ '^dev01b-v5-[a-f0-9]{16}$'),
 project_ref text NOT NULL DEFAULT 'rfwqcrvxyjhtmafnbuyy' CHECK(project_ref='rfwqcrvxyjhtmafnbuyy'),
 phase text NOT NULL DEFAULT 'new' CHECK(phase IN ('new','creating','ready','testing','cleaning','clean','blocked')),
 lease_owner uuid, lease_expires_at timestamptz,
 fencing_token bigint NOT NULL DEFAULT 0 CHECK(fencing_token>=0),
 create_until timestamptz NOT NULL, cleanup_until timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(cleanup_until>create_until)
);
CREATE TABLE dev01b_test.resources (
 run_id text NOT NULL REFERENCES dev01b_test.runs(run_id),
 kind text NOT NULL CHECK(kind IN ('auth_user','draft','storage_photo','cross_rls_probe')),
 role text NOT NULL CHECK(role IN ('a','b')),
 resource_key text NOT NULL,
 state text NOT NULL CHECK(state IN ('intent','present','delete_pending','deleted','uncertain')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(run_id,kind,role), UNIQUE(kind,resource_key)
);
CREATE TABLE dev01b_test.events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 run_id text NOT NULL REFERENCES dev01b_test.runs(run_id),
 operation_id uuid NOT NULL,
 event_type text NOT NULL,
 kind text,
 role text,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(run_id,operation_id,event_type)
);
REVOKE ALL ON ALL TABLES IN SCHEMA dev01b_test FROM PUBLIC,anon,authenticated;
-- RPC wrappers live in public because PostgREST doesn't expose private dev01b_test schema.
-- EXECUTE is revoked from PUBLIC and authenticated. Only service_role may call.
CREATE FUNCTION public.dev01b_v5_claim(p_run text,p_owner uuid,p_cleanup boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r dev01b_test.runs%ROWTYPE;
BEGIN
 -- EXECUTE grant to service_role only; SECURITY DEFINER changes current_user.
 SELECT * INTO r FROM dev01b_test.runs WHERE run_id=p_run FOR UPDATE;
 IF NOT FOUND OR r.project_ref<>'rfwqcrvxyjhtmafnbuyy' THEN RAISE EXCEPTION 'unknown_run'; END IF;
 IF r.phase IN ('blocked','clean') THEN RAISE EXCEPTION 'run_blocked'; END IF;
 IF (NOT p_cleanup AND clock_timestamp()>r.create_until) OR (p_cleanup AND clock_timestamp()>r.cleanup_until) THEN RAISE EXCEPTION 'window_closed'; END IF;
 -- Expired leases are NOT automatically stolen; require separately reviewed recovery.
 IF r.lease_owner IS NOT NULL THEN RAISE EXCEPTION 'lease_busy_requires_recovery'; END IF;
 UPDATE dev01b_test.runs SET lease_owner=p_owner,lease_expires_at=clock_timestamp()+interval '90 seconds',fencing_token=fencing_token+1 WHERE run_id=p_run RETURNING fencing_token INTO r.fencing_token;
 RETURN r.fencing_token;
END $$;
CREATE FUNCTION public.dev01b_v5_renew(p_run text,p_owner uuid,p_fence bigint)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_exp timestamptz;
BEGIN
 -- EXECUTE grant to service_role only; SECURITY DEFINER changes current_user.
 UPDATE dev01b_test.runs SET lease_expires_at=clock_timestamp()+interval '90 seconds'
 WHERE run_id=p_run AND lease_owner=p_owner AND fencing_token=p_fence AND lease_expires_at>clock_timestamp()
 AND phase NOT IN ('clean','blocked') AND clock_timestamp()<cleanup_until
 RETURNING lease_expires_at INTO v_exp;
 IF NOT FOUND THEN RAISE EXCEPTION 'lease_stale_or_expired'; END IF;
 RETURN v_exp;
END $$;
CREATE FUNCTION public.dev01b_v5_event(p_run text,p_owner uuid,p_fence bigint,p_operation uuid,p_event text,p_kind text DEFAULT NULL,p_role text DEFAULT NULL,p_key text DEFAULT NULL,p_state text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r dev01b_test.runs%ROWTYPE;
BEGIN
 -- EXECUTE grant to service_role only; SECURITY DEFINER changes current_user.
 SELECT * INTO r FROM dev01b_test.runs WHERE run_id=p_run FOR UPDATE;
 IF NOT FOUND OR r.lease_owner IS DISTINCT FROM p_owner OR r.fencing_token<>p_fence OR r.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'lease_invalid'; END IF;
 IF p_event NOT IN ('intent','present','uncertain','delete_pending','deleted','checkpoint') THEN RAISE EXCEPTION 'bad_event'; END IF;
 IF p_kind IS NOT NULL THEN
  IF p_kind NOT IN ('auth_user','draft','storage_photo','cross_rls_probe') OR p_role NOT IN ('a','b') OR p_key IS NULL OR p_state NOT IN ('intent','present','uncertain','delete_pending','deleted') THEN RAISE EXCEPTION 'bad_resource'; END IF;
  INSERT INTO dev01b_test.resources(run_id,kind,role,resource_key,state) VALUES(p_run,p_kind,p_role,p_key,p_state)
  ON CONFLICT(run_id,kind,role) DO UPDATE SET state=EXCLUDED.state,updated_at=now()
  WHERE dev01b_test.resources.resource_key=EXCLUDED.resource_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'resource_key_mismatch'; END IF;
 END IF;
 INSERT INTO dev01b_test.events(run_id,operation_id,event_type,kind,role) VALUES(p_run,p_operation,p_event,p_kind,p_role);
END $$;
CREATE FUNCTION public.dev01b_v5_release(p_run text,p_owner uuid,p_fence bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- EXECUTE grant to service_role only; SECURITY DEFINER changes current_user.
 UPDATE dev01b_test.runs SET lease_owner=NULL,lease_expires_at=NULL WHERE run_id=p_run AND lease_owner=p_owner AND fencing_token=p_fence AND lease_expires_at>clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION 'lease_invalid'; END IF;
END $$;
CREATE FUNCTION public.dev01b_v5_ledger(p_run text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- EXECUTE grant to service_role only; SECURITY DEFINER changes current_user.
 RETURN jsonb_build_object('run',(SELECT to_jsonb(r) FROM dev01b_test.runs r WHERE r.run_id=p_run),'resources',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM dev01b_test.resources s WHERE s.run_id=p_run));
END $$;
REVOKE ALL ON FUNCTION public.dev01b_v5_claim(text,uuid,boolean),public.dev01b_v5_renew(text,uuid,bigint),public.dev01b_v5_event(text,uuid,bigint,uuid,text,text,text,text,text),public.dev01b_v5_release(text,uuid,bigint),public.dev01b_v5_ledger(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dev01b_v5_claim(text,uuid,boolean),public.dev01b_v5_renew(text,uuid,bigint),public.dev01b_v5_event(text,uuid,bigint,uuid,text,text,text,text,text),public.dev01b_v5_release(text,uuid,bigint),public.dev01b_v5_ledger(text) TO service_role;
-- Separately authorized bootstrap (not exposed as RPC): INSERT exact run_id + UTC windows into dev01b_test.runs.
-- Recovery after expiry requires explicit owner review and reconciliation, never auto-claim.

-- Recovery is intentionally not exposed as a callable public RPC.
-- A separate authorized operator must inspect Auth/Storage/ledger and then
-- manually reset an expired lease under a database transaction; the next claim increments fencing_token.
-- Fencing protects ledger mutations, NOT in-flight external Auth/Storage HTTP calls.