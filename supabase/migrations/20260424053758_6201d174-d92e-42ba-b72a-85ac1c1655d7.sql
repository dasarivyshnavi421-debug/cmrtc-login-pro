DROP POLICY IF EXISTS "Authenticated read-only attendance" ON public.attendance_records;

CREATE POLICY "Public read attendance"
ON public.attendance_records
FOR SELECT
TO anon, authenticated
USING (true);