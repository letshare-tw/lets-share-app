-- Test-branch supplement; original SECURITY-V5-REVIEW.sql remains unchanged.
-- Supabase default ACL grants EXECUTE directly to authenticated. Not granting
-- it again does not revoke that privilege. No remote deployment is authorized.
REVOKE ALL ON FUNCTION public.lx_attach_my_draft_placement(uuid,text,uuid,text,text)
FROM PUBLIC,anon,authenticated;
