-- Create faculty table
CREATE TABLE public.faculty (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  face_descriptor DOUBLE PRECISION[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
  method TEXT DEFAULT 'manual' CHECK (method IN ('manual', 'face')),
  in_time TEXT,
  out_time TEXT,
  timestamp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, date)
);

-- Enable RLS
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Faculty: readable and writable by all authenticated users
CREATE POLICY "Authenticated users can read faculty" ON public.faculty FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert faculty" ON public.faculty FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update faculty" ON public.faculty FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete faculty" ON public.faculty FOR DELETE TO authenticated USING (true);

-- Attendance: readable and writable by all authenticated users
CREATE POLICY "Authenticated users can read attendance" ON public.attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete attendance" ON public.attendance_records FOR DELETE TO authenticated USING (true);

-- Seed default faculty
INSERT INTO public.faculty (name, department, email) VALUES
  ('Dr. Priya Sharma', 'Computer Science', 'priya@college.edu'),
  ('Prof. Ravi Kumar', 'Mathematics', 'ravi@college.edu'),
  ('Dr. Anita Reddy', 'Physics', 'anita@college.edu'),
  ('Prof. Suresh Naidu', 'Electronics', 'suresh@college.edu'),
  ('Dr. Meena Verma', 'Chemistry', 'meena@college.edu');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();