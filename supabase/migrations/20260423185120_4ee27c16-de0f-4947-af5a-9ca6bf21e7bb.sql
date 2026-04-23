
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create faculty_credentials table for secure password storage
CREATE TABLE public.faculty_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id integer NOT NULL UNIQUE REFERENCES public.faculty(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_credentials ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = clients cannot read password hashes

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id integer NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'faculty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- No policies = clients cannot access roles directly

-- Create helper function for role checks
CREATE OR REPLACE FUNCTION public.get_faculty_role(p_faculty_id integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE faculty_id = p_faculty_id LIMIT 1;
$$;

-- Insert admin into faculty if not already present
INSERT INTO public.faculty (name, department, email)
SELECT 'Dr. Subhash', 'Administration', 'subhashcsm@cmrtc.ac.in'
WHERE NOT EXISTS (SELECT 1 FROM public.faculty WHERE email = 'subhashcsm@cmrtc.ac.in');

-- Set up admin credentials and role
DO $$
DECLARE v_admin_id integer;
BEGIN
  SELECT id INTO v_admin_id FROM public.faculty WHERE email = 'subhashcsm@cmrtc.ac.in';
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles (faculty_id, role) VALUES (v_admin_id, 'admin') ON CONFLICT (faculty_id, role) DO NOTHING;
    INSERT INTO public.faculty_credentials (faculty_id, password_hash) 
    VALUES (v_admin_id, crypt('subhash123', gen_salt('bf')))
    ON CONFLICT (faculty_id) DO NOTHING;
  END IF;
END $$;

-- Migrate existing faculty plaintext passwords to hashed credentials
INSERT INTO public.faculty_credentials (faculty_id, password_hash)
SELECT id, crypt(login_password, gen_salt('bf'))
FROM public.faculty 
WHERE login_password IS NOT NULL 
  AND id NOT IN (SELECT faculty_id FROM public.faculty_credentials)
ON CONFLICT (faculty_id) DO NOTHING;

-- Assign faculty role to all users without a role
INSERT INTO public.user_roles (faculty_id, role)
SELECT id, 'faculty' FROM public.faculty
WHERE id NOT IN (SELECT faculty_id FROM public.user_roles)
ON CONFLICT (faculty_id, role) DO NOTHING;

-- Drop the plaintext password column (critical security fix)
ALTER TABLE public.faculty DROP COLUMN IF EXISTS login_password;

-- Drop all overly permissive policies on faculty
DROP POLICY IF EXISTS "Allow all delete on faculty" ON public.faculty;
DROP POLICY IF EXISTS "Allow all insert on faculty" ON public.faculty;
DROP POLICY IF EXISTS "Allow all select on faculty" ON public.faculty;
DROP POLICY IF EXISTS "Allow all update on faculty" ON public.faculty;

-- Drop all overly permissive policies on attendance_records
DROP POLICY IF EXISTS "Allow all delete on attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all insert on attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all select on attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all update on attendance" ON public.attendance_records;

-- Add read-only SELECT policies (safe now that login_password is dropped)
CREATE POLICY "Read-only faculty access" ON public.faculty
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Read-only attendance access" ON public.attendance_records
FOR SELECT TO anon, authenticated USING (true);

-- Trigger for updated_at on faculty_credentials
CREATE TRIGGER update_faculty_credentials_updated_at
BEFORE UPDATE ON public.faculty_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
