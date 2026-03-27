import { useState, useEffect } from "react";
import { loadData, getAttendance, getDepartments, exportCSV, type Faculty, type AttendanceRecord } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Download, Filter, LogIn, LogOut, Calendar } from "lucide-react";

const AttendanceHistoryTab = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    const data = loadData();
    setFaculty(data.faculty);
    setRecords(getAttendance(selectedDate));
    setDepartments(getDepartments());
  }, [selectedDate]);

  const filteredFaculty = selectedDept === "all" ? faculty : faculty.filter((f) => f.department === selectedDept);

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

  const statusBadge = (status?: string) => {
    if (!status) return <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Not Marked</span>;
    const styles: Record<string, string> = {
      present: "bg-success/15 text-success border border-success/30",
      absent: "bg-destructive/15 text-destructive border border-destructive/30",
      leave: "bg-warning/15 text-warning border border-warning/30",
    };
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || ""}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
          />
        </div>
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
                    <td className="px-4 py-3">{statusBadge(rec?.status)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rec?.inTime ? (
                        <span className="text-xs text-success flex items-center gap-1"><LogIn className="w-3 h-3" /> {rec.inTime}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rec?.outTime ? (
                        <span className="text-xs text-destructive flex items-center gap-1"><LogOut className="w-3 h-3" /> {rec.outTime}</span>
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

export default AttendanceHistoryTab;
