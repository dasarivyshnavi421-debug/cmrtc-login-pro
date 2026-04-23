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

function getToken(): string | null {
  return localStorage.getItem("att_token");
}

// ---- Faculty CRUD ----

export async function fetchFaculty(): Promise<Faculty[]> {
  const { data, error } = await supabase
    .from("faculty")
    .select("id, name, department, email, photo_url, created_at, profile_updated_at")
    .order("id");
  if (error) throw error;
  return (data || []).map((f) => ({
    id: f.id,
    name: f.name,
    department: f.department,
    email: f.email,
    photoUrl: f.photo_url ?? undefined,
    profileUpdatedAt: f.profile_updated_at ?? undefined,
  }));
}

export async function fetchFacultyWithDescriptor(facultyId: number): Promise<Faculty | null> {
  const { data, error } = await supabase
    .from("faculty")
    .select("id, name, department, email, photo_url, face_descriptor, profile_updated_at")
    .eq("id", facultyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    department: data.department,
    email: data.email,
    photoUrl: data.photo_url ?? undefined,
    faceDescriptor: data.face_descriptor ?? undefined,
    profileUpdatedAt: data.profile_updated_at ?? undefined,
  };
}

export async function getDepartments(): Promise<string[]> {
  const faculty = await fetchFaculty();
  return [...new Set(faculty.map((f) => f.department))].sort();
}

export async function addFaculty(name: string, department: string, email: string, password: string, photoUrl?: string): Promise<Faculty> {
  const token = getToken();
  const { data, error } = await supabase.functions.invoke("faculty-api", {
    body: { action: "add", name, department, email, password, photo_url: photoUrl },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
  const f = data.faculty;
  return { id: f.id, name: f.name, department: f.department, email: f.email, photoUrl: f.photo_url ?? undefined };
}

export async function deleteFaculty(id: number) {
  const token = getToken();
  const { error } = await supabase.functions.invoke("faculty-api", {
    body: { action: "delete", id },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
}

export async function updateFacultyPhoto(id: number, photoUrl: string, faceDescriptor?: number[]) {
  const token = getToken();
  const { error } = await supabase.functions.invoke("faculty-api", {
    body: { action: "update_photo", id, photo_url: photoUrl, face_descriptor: faceDescriptor },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
}

export async function updateFaculty(id: number, name: string, department: string, email: string) {
  const token = getToken();
  const { error } = await supabase.functions.invoke("faculty-api", {
    body: { action: "update", id, name, department, email },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
  const token = getToken();
  const { error } = await supabase.functions.invoke("attendance-api", {
    body: {
      action: "mark",
      faculty_id: facultyId,
      date,
      status,
      method,
      in_time: inTime,
      out_time: outTime,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
}

export async function markOutTime(facultyId: number, date: string) {
  const token = getToken();
  const { error } = await supabase.functions.invoke("attendance-api", {
    body: { action: "mark_out", faculty_id: facultyId, date },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw error;
}

export async function updateFaceDescriptor(facultyId: number, faceDescriptor: number[]) {
  const token = getToken();
  const { error } = await supabase.functions.invoke("attendance-api", {
    body: { action: "update_face_descriptor", faculty_id: facultyId, face_descriptor: faceDescriptor },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
