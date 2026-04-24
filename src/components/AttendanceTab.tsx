import { useState, useEffect } from "react";
import { fetchFaculty, markAttendance, markOutTime, getAttendance, getDepartments, type Faculty, type AttendanceRecord } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Save, CheckCheck, LogIn, LogOut, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onUpdate: () => void;
}

const AttendanceTab = ({ onUpdate }: Props) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [pending, setPending] = useState<Record<number, AttendanceRecord["status"]>>({});
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    try {
      const [fac, recs, depts] = await Promise.all([
        fetchFaculty(),
        getAttendance(selectedDate),
        getDepartments(),
      ]);
      setFaculty(fac);
      setRecords(recs);
      setDepartments(depts);
      setPending({});
    } catch (err) {
      console.error("Failed to load attendance data:", err);
    }
  };

  useEffect(() => { loadAll(); }, [selectedDate]);

  const filteredFaculty = selectedDept === "all" ? faculty : faculty.filter((f) => f.department === selectedDept);

  const setStatus = (id: number, status: AttendanceRecord["status"]) => {
    setPending((prev) => ({ ...prev, [id]: status }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(pending).map(([id, status]) =>
          markAttendance(Number(id), selectedDate, status, "manual")
        )
      );
      const recs = await getAttendance(selectedDate);
      setRecords(recs);
      setPending({});
      onUpdate();
      toast({ title: "✅ Attendance saved!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkOut = async (id: number) => {
    try {
      await markOutTime(id, selectedDate);
      const recs = await getAttendance(selectedDate);
      setRecords(recs);
      onUpdate();
      toast({ title: "🕐 Out-time marked!" });
    } catch {
      toast({ title: "Failed to mark out-time", variant: "destructive" });
    }
  };

  const markAllPresent = () => {
    const newPending: Record<number, AttendanceRecord["status"]> = {};
    filteredFaculty.forEach((f) => { newPending[f.id] = "present"; });
    setPending(newPending);
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
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <Button onClick={saveAll} disabled={saving} size="sm" className="gradient-bg text-primary-foreground gap-1.5">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save All"}
        </Button>
        <Button onClick={markAllPresent} variant="outline" size="sm" className="gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" /> All Present
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
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">In Time</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Out Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredFaculty.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No faculty found.</td></tr>
            ) : (
              filteredFaculty.map((f, i) => {
                const rec = records[String(f.id)];
                return (
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
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rec?.inTime ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <LogIn className="w-3 h-3" /> {rec.inTime}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rec?.outTime ? (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <LogOut className="w-3 h-3" /> {rec.outTime}
                        </span>
                      ) : rec?.status === "present" ? (
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => handleMarkOut(f.id)}>
                          <LogOut className="w-3 h-3" /> Mark Out
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTab;
