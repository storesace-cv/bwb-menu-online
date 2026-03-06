-- profiles.renew_password: 1 = pedir renovação de password, 0 = não pedir.
-- Fonte de verdade na BD; substitui user_metadata.must_change_password.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS renew_password boolean NOT NULL DEFAULT false;

-- RLS: utilizador autenticado pode ler e actualizar o próprio profile (para renew_password).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
