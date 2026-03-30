
-- Drop existing restrictive policies on faculty
DROP POLICY IF EXISTS "Authenticated users can delete faculty" ON public.faculty;
DROP POLICY IF EXISTS "Authenticated users can insert faculty" ON public.faculty;
DROP POLICY IF EXISTS "Authenticated users can read faculty" ON public.faculty;
DROP POLICY IF EXISTS "Authenticated users can update faculty" ON public.faculty;

-- Create policies that allow anon access (app uses custom auth, not Supabase Auth)
CREATE POLICY "Allow all select on faculty" ON public.faculty FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all insert on faculty" ON public.faculty FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update on faculty" ON public.faculty FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow all delete on faculty" ON public.faculty FOR DELETE TO anon, authenticated USING (true);

-- Drop existing restrictive policies on attendance_records
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can read attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON public.attendance_records;

-- Create policies that allow anon access
CREATE POLICY "Allow all select on attendance" ON public.attendance_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all insert on attendance" ON public.attendance_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update on attendance" ON public.attendance_records FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow all delete on attendance" ON public.attendance_records FOR DELETE TO anon, authenticated USING (true);
