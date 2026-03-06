-- Allow store_integrations.source_type 'none' so a store can have an integration row with no active connector.
-- Config jsonb format (documented): integration_type, netbo_dbname, netbo_auth_method, netbo_login,
-- netbo_password_encrypted, netbo_api_token_encrypted, netbo_company_server_url, netbo_token_last_ok_at, etc.
-- Secrets are never returned to client; has_* flags are computed when reading.

ALTER TABLE public.store_integrations
  DROP CONSTRAINT IF EXISTS store_integrations_source_type_check;

ALTER TABLE public.store_integrations
  ADD CONSTRAINT store_integrations_source_type_check
  CHECK (source_type IN ('none', 'netbo', 'storesace'));
