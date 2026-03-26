import { useState, useEffect } from "react";
import { loadData, markAttendance, getAttendance, exportCSV, type Faculty, type AttendanceRecord } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Save, CheckCheck, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onUpdate: () => void;
}

const AttendanceTab = ({ onUpdate }: Props) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [pending, setPending] = useState<Record<number, AttendanceRecord["status"]>>({});
  const { toast } = useToast();

  useEffect(() => {
    const data = loadData();
    setFaculty(data.faculty);
    setRecords(getAttendance(selectedDate));
    setPending({});
  }, [selectedDate]);

  const setStatus = (id: number, status: AttendanceRecord["status"]) => {
    setPending((prev) => ({ ...prev, [id]: status }));
  };

  const saveAll = () => {
    Object.entries(pending).forEach(([id, status]) => {
      markAttendance(Number(id), selectedDate, status, "manual");
    });
    setRecords(getAttendance(selectedDate));
    setPending({});
    onUpdate();
    toast({ title: "✅ Attendance saved!" });
  };

  const markAllPresent = () => {
    const newPending: Record<number, AttendanceRecord["status"]> = {};
    faculty.forEach((f) => { newPending[f.id] = "present"; });
    setPending(newPending);
  };

  const handleExport = () => {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatus = (id: number) => pending[id] || records[String(id)]?.status || "";

  const statusBtnClass = (status: string, current: string) => {
    const base = "px-3 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ";
    const map: Record<string, { active: string; inactive: string }> = {
      present: { active: "bg-success text-success-foreground border-success", inactive: "bg-success/10 text-success border-success/30 hover:bg-success/20" },
      absent: { active: "bg-destructive text-destructive-foreground border-destructive", inactive: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20" },
      leave: { active: "bg-warning text-warning-foreground border-warning", inactive: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20" },
    };
    return base + (current === status ? map[status].active : map[status].inactive);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Date:</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
        />
        <Button onClick={saveAll} size="sm" className="gradient-bg text-primary-foreground gap-1.5">
          <Save className="w-3.5 h-3.5" /> Save All
        </Button>
        <Button onClick={markAllPresent} variant="outline" size="sm" className="gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" /> All Present
        </Button>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      <div className="glass-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Faculty</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Department</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {faculty.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No faculty added yet.</td></tr>
            ) : (
              faculty.map((f, i) => (
                <tr key={f.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {f.photoUrl ? (
                        <img src={f.photoUrl} alt={f.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {f.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <span className="font-medium text-sm">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">{f.department}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(["present", "absent", "leave"] as const).map((s) => (
                        <button key={s} onClick={() => setStatus(f.id, s)} className={statusBtnClass(s, getStatus(f.id))}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTab;
