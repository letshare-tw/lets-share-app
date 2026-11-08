-- DEPLOY-03 candidate, isolated CI only. NOT applied to any remote Supabase.
-- Service-role-only adapter: caller must be trusted Edge service key. The Edge
-- handler independently validates the member JWT using auth.getUser(token).
-- A p_user value from an untrusted client is NEVER acceptable.
BEGIN;
CREATE OR REPLACE FUNCTION public.lx_edge_submit_share_request(
 p_user uuid,p_request uuid,p_version text,p_transfer boolean,p_no_return boolean,p_recycling boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE previous text:=coalesce(current_setting('request.jwt.claim.sub',true),'');
        role_claim text:=coalesce(current_setting('request.jwt.claim.role',true),'');
        result uuid;
BEGIN
 IF role_claim <> 'service_role' THEN
  RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
 END IF;
 IF p_user IS NULL OR p_request IS NULL OR nullif(btrim(p_version),'') IS NULL THEN
  RAISE EXCEPTION 'invalid_submission' USING ERRCODE='22023';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',p_user::text,true);
 result:=public.lx_submit_share_request(p_request,p_version,p_transfer,p_no_return,p_recycling);
 PERFORM set_config('request.jwt.claim.sub',previous,true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claim.sub',previous,true);
 RAISE;
END $$;
REVOKE ALL ON FUNCTION public.lx_edge_submit_share_request(uuid,uuid,text,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lx_edge_submit_share_request(uuid,uuid,text,boolean,boolean,boolean) TO service_role;
COMMIT;
