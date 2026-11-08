-- CI-only internal adapter, never deployed remotely. Public callers cannot
-- choose a subject. The Edge handler verifies the JWT and supplies this uid.
CREATE FUNCTION public.gate1_internal_submit(p_user uuid,p_request uuid,p_version text,
 p_transfer boolean,p_no_return boolean,p_recycling boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous text:=coalesce(current_setting('request.jwt.claim.sub',true),'');result uuid;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_user::text,true);
 result:=public.lx_submit_share_request(p_request,p_version,p_transfer,p_no_return,p_recycling);
 PERFORM set_config('request.jwt.claim.sub',previous,true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claim.sub',previous,true);
 RAISE;
END $$;
REVOKE ALL ON FUNCTION public.gate1_internal_submit(uuid,uuid,text,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gate1_internal_submit(uuid,uuid,text,boolean,boolean,boolean) TO service_role;
