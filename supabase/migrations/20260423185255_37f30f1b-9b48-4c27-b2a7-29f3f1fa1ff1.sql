
-- Function to verify password (used by login edge function)
CREATE OR REPLACE FUNCTION public.verify_password(p_faculty_id integer, p_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_credentials
    WHERE faculty_id = p_faculty_id
      AND password_hash = extensions.crypt(p_password, password_hash)
  );
$$;

-- Function to set/update password (used by faculty-api edge function)
CREATE OR REPLACE FUNCTION public.set_faculty_password(p_faculty_id integer, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.faculty_credentials (faculty_id, password_hash)
  VALUES (p_faculty_id, extensions.crypt(p_password, extensions.gen_salt('bf')))
  ON CONFLICT (faculty_id)
  DO UPDATE SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now();
END;
$$;
