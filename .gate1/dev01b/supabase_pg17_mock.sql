-- Isolated GitHub Actions fixture only; NOT a Supabase migration.
-- No real accounts, credentials, emails, or remote services.
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 email text,
 created_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
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
 SELECT string_to_array(regexp_replace(p_name,'/[^/]*$',''),'/')
$$;
-- Test-only authenticated role receives normal schema access.
GRANT USAGE ON SCHEMA auth,storage TO authenticated,anon,service_role;
GRANT SELECT ON auth.users TO authenticated,service_role;
GRANT SELECT ON storage.buckets TO authenticated,service_role;
GRANT SELECT,INSERT ON storage.objects TO authenticated,service_role;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
