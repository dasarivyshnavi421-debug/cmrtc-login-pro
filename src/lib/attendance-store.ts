export interface Faculty {
  id: number;
  name: string;
  department: string;
  email: string;
  photoUrl?: string;
  faceDescriptor?: number[];
}

export interface AttendanceRecord {
  status: "present" | "absent" | "leave";
  timestamp: string;
  method?: "manual" | "face";
}

export interface AttendanceData {
  faculty: Faculty[];
  attendance: Record<string, Record<string, AttendanceRecord>>;
}

const STORAGE_KEY = "faculty_attendance_data";

const DEFAULT_FACULTY: Faculty[] = [
  { id: 1, name: "Dr. Priya Sharma", department: "Computer Science", email: "priya@college.edu" },
  { id: 2, name: "Prof. Ravi Kumar", department: "Mathematics", email: "ravi@college.edu" },
  { id: 3, name: "Dr. Anita Reddy", department: "Physics", email: "anita@college.edu" },
  { id: 4, name: "Prof. Suresh Naidu", department: "Electronics", email: "suresh@college.edu" },
  { id: 5, name: "Dr. Meena Verma", department: "Chemistry", email: "meena@college.edu" },
];

export function loadData(): AttendanceData {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const data: AttendanceData = { faculty: DEFAULT_FACULTY, attendance: {} };
  saveData(data);
  return data;
}

export function saveData(data: AttendanceData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addFaculty(name: string, department: string, email: string, photoUrl?: string): Faculty {
  const data = loadData();
  const newId = Math.max(0, ...data.faculty.map((f) => f.id)) + 1;
  const faculty: Faculty = { id: newId, name, department, email, photoUrl };
  data.faculty.push(faculty);
  saveData(data);
  return faculty;
}

export function deleteFaculty(id: number) {
  const data = loadData();
  data.faculty = data.faculty.filter((f) => f.id !== id);
  saveData(data);
}

export function updateFacultyPhoto(id: number, photoUrl: string, faceDescriptor?: number[]) {
  const data = loadData();
  const faculty = data.faculty.find((f) => f.id === id);
  if (faculty) {
    faculty.photoUrl = photoUrl;
    if (faceDescriptor) faculty.faceDescriptor = faceDescriptor;
    saveData(data);
  }
}

export function markAttendance(facultyId: number, date: string, status: AttendanceRecord["status"], method: "manual" | "face" = "manual") {
  const data = loadData();
  if (!data.attendance[date]) data.attendance[date] = {};
  data.attendance[date][String(facultyId)] = {
    status,
    timestamp: new Date().toLocaleTimeString(),
    method,
  };
  saveData(data);
}

export function getAttendance(date: string) {
  const data = loadData();
  return data.attendance[date] || {};
}

export function getStats() {
  const data = loadData();
  return data.faculty.map((f) => {
    const totalDays = Object.keys(data.attendance).length;
    let present = 0, absent = 0, leave = 0;
    for (const records of Object.values(data.attendance)) {
      const r = records[String(f.id)];
      if (r?.status === "present") present++;
      else if (r?.status === "absent") absent++;
      else if (r?.status === "leave") leave++;
    }
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100 * 10) / 10 : 0;
    return { ...f, present, absent, leave, totalDays, percentage };
  });
}

export function exportCSV(): string {
  const data = loadData();
  const rows = ["Faculty Name,Department,Date,Status,Time,Method"];
  for (const [date, records] of Object.entries(data.attendance).sort()) {
    for (const [fid, info] of Object.entries(records)) {
      const faculty = data.faculty.find((f) => String(f.id) === fid);
      if (faculty) {
        rows.push(`${faculty.name},${faculty.department},${date},${info.status},${info.timestamp},${info.method || "manual"}`);
      }
    }
  }
  return rows.join("\n");
}
