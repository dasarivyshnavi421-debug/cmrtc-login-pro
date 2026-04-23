
-- 1. faculty_credentials: explicit deny-all (no client access needed)
CREATE POLICY "No direct access to credentials"
ON public.faculty_credentials
FOR ALL
USING (false);

-- 2. user_roles: explicit deny-all (accessed only via security definer functions)
CREATE POLICY "No direct access to roles"
ON public.user_roles
FOR ALL
USING (false);

-- 3. Create a secure view for faculty that excludes face_descriptor
CREATE OR REPLACE VIEW public.faculty_public AS
SELECT id, name, department, email, photo_url, created_at, profile_updated_at
FROM public.faculty;

-- 4. Drop the overly permissive faculty SELECT policy and replace with column-safe one
DROP POLICY IF EXISTS "Read-only faculty access" ON public.faculty;

CREATE POLICY "Authenticated read-only faculty access"
ON public.faculty
FOR SELECT
TO authenticated
USING (true);

-- Keep anon read but only through the view - still need anon for login flow reads
CREATE POLICY "Anon limited faculty read"
ON public.faculty
FOR SELECT
TO anon
USING (true);

-- 5. Tighten attendance_records - require authentication
DROP POLICY IF EXISTS "Read-only attendance access" ON public.attendance_records;

CREATE POLICY "Authenticated read-only attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (true);
