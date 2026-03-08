-- Create Storage bucket for menu images if the storage schema is available (e.g. self-hosted Supabase).
-- If storage.buckets does not exist or is not writable, this block does nothing; the API will create the bucket on first upload.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('menu-images', 'menu-images', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
