DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.lx_share_requests)
 OR EXISTS(SELECT 1 FROM public.lx_share_bags)
 OR EXISTS(SELECT 1 FROM public.lx_share_draft_details)
 OR EXISTS(SELECT 1 FROM public.lx_share_draft_placements)
 THEN RAISE EXCEPTION 'cleanup residual rows'; END IF;
 RAISE NOTICE 'PASS: scoped original cleanup leaves no draft, placement or bag rows';
END $$;
