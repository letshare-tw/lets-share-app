-- Isolated GitHub Actions fixture only; NOT a Supabase migration.
-- No real accounts, credentials, emails, or remote services.
ALTER ROLE anon NOBYPASSRLS NOSUPERUSER;
ALTER ROLE authenticated NOBYPASSRLS NOSUPERUSER;
ALTER ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
-- Reproduce hosted Supabase defaults, including the legacy EXECUTE trap.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 email text,
 raw_app_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(NULLIF(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
CREATE TABLE storage.buckets (
 id text PRIMARY KEY,
 name text NOT NULL,
 public boolean NOT NULL DEFAULT false,
 file_size_limit bigint,
 allowed_mime_types text[]
);
CREATE TABLE storage.objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bucket_id text NOT NULL REFERENCES storage.buckets(id),
 name text NOT NULL,
 owner_id text,
 created_at timestamptz DEFAULT now(),
 UNIQUE(bucket_id,name)
);
CREATE FUNCTION storage.foldername(p_name text) RETURNS text[]
 LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN strpos(p_name,'/')=0 THEN ARRAY[]::text[]
 ELSE (string_to_array(p_name,'/'))[1:array_length(string_to_array(p_name,'/'),1)-1] END
$$;
-- Test-only authenticated role receives normal schema access.
GRANT USAGE ON SCHEMA auth,storage TO authenticated,anon,service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON storage.buckets TO authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
