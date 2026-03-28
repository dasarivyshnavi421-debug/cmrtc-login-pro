import { supabase } from "@/integrations/supabase/client";

export interface Faculty {
  id: number;
  name: string;
  department: string;
  email: string;
  photoUrl?: string;
  faceDescriptor?: number[];
  profileUpdatedAt?: string;
}

export interface AttendanceRecord {
  status: "present" | "absent" | "leave";
  timestamp: string;
  method?: "manual" | "face";
  inTime?: string;
  outTime?: string;
}

// ---- Faculty CRUD ----

export async function fetchFaculty(): Promise<Faculty[]> {
  const { data, error } = await supabase
    .from("faculty")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map((f) => ({
    id: f.id,
    name: f.name,
    department: f.department,
    email: f.email,
    photoUrl: f.photo_url ?? undefined,
    faceDescriptor: f.face_descriptor ?? undefined,
  }));
}

export async function getDepartments(): Promise<string[]> {
  const faculty = await fetchFaculty();
  return [...new Set(faculty.map((f) => f.department))].sort();
}

export async function addFaculty(name: string, department: string, email: string, photoUrl?: string): Promise<Faculty> {
  const { data, error } = await supabase
    .from("faculty")
    .insert({ name, department, email, photo_url: photoUrl })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, department: data.department, email: data.email, photoUrl: data.photo_url ?? undefined };
}

export async function deleteFaculty(id: number) {
  const { error } = await supabase.from("faculty").delete().eq("id", id);
  if (error) throw error;
}

export async function updateFacultyPhoto(id: number, photoUrl: string, faceDescriptor?: number[]) {
  const update: Record<string, unknown> = { photo_url: photoUrl };
  if (faceDescriptor) update.face_descriptor = faceDescriptor;
  const { error } = await supabase.from("faculty").update(update).eq("id", id);
  if (error) throw error;
}

// ---- Attendance ----

export async function getAttendance(date: string): Promise<Record<string, AttendanceRecord>> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("date", date);
  if (error) throw error;
  const records: Record<string, AttendanceRecord> = {};
  (data || []).forEach((r) => {
    records[String(r.faculty_id)] = {
      status: r.status as AttendanceRecord["status"],
      timestamp: r.timestamp || "",
      method: (r.method as "manual" | "face") || "manual",
      inTime: r.in_time ?? undefined,
      outTime: r.out_time ?? undefined,
    };
  });
  return records;
}

export async function markAttendance(
  facultyId: number,
  date: string,
  status: AttendanceRecord["status"],
  method: "manual" | "face" = "manual",
  inTime?: string,
  outTime?: string
) {
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  // Check for existing record
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("faculty_id", facultyId)
    .eq("date", date)
    .maybeSingle();

  const record = {
    faculty_id: facultyId,
    date,
    status,
    method,
    timestamp: now,
    in_time: inTime || existing?.in_time || (status === "present" ? now : null),
    out_time: outTime || existing?.out_time || null,
  };

  if (existing) {
    const { error } = await supabase
      .from("attendance_records")
      .update(record)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("attendance_records")
      .insert(record);
    if (error) throw error;
  }
}

export async function markOutTime(facultyId: number, date: string) {
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const { error } = await supabase
    .from("attendance_records")
    .update({ out_time: now })
    .eq("faculty_id", facultyId)
    .eq("date", date);
  if (error) throw error;
}

export async function getStats(department?: string) {
  const faculty = await fetchFaculty();
  const filtered = department ? faculty.filter((f) => f.department === department) : faculty;

  const { data: allRecords } = await supabase
    .from("attendance_records")
    .select("*");

  const records = allRecords || [];
  const uniqueDates = new Set(records.map((r) => r.date));
  const totalDays = uniqueDates.size;

  return filtered.map((f) => {
    let present = 0, absent = 0, leave = 0;
    records.forEach((r) => {
      if (r.faculty_id === f.id) {
        if (r.status === "present") present++;
        else if (r.status === "absent") absent++;
        else if (r.status === "leave") leave++;
      }
    });
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100 * 10) / 10 : 0;
    return { ...f, present, absent, leave, totalDays, percentage };
  });
}

export async function exportCSV(): Promise<string> {
  const faculty = await fetchFaculty();
  const { data: allRecords } = await supabase
    .from("attendance_records")
    .select("*")
    .order("date");

  const rows = ["Faculty Name,Department,Date,Status,In Time,Out Time,Method"];
  (allRecords || []).forEach((r) => {
    const f = faculty.find((fac) => fac.id === r.faculty_id);
    if (f) {
      rows.push(`${f.name},${f.department},${r.date},${r.status},${r.in_time || "-"},${r.out_time || "-"},${r.method || "manual"}`);
    }
  });
  return rows.join("\n");
}
