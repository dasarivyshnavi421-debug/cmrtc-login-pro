import { useEffect, useState } from "react";
import { getStats, getDepartments, getAttendance } from "@/lib/attendance-store";
import { Filter, Calendar } from "lucide-react";

interface StatRow {
  id: number;
  name: string;
  department: string;
  present: number;
  absent: number;
  leave: number;
  totalDays: number;
  percentage: number;
}

const ReportsTab = () => {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyRecords, setDailyRecords] = useState<Record<string, any>>({});
  const [deptSummary, setDeptSummary] = useState<{ department: string; count: number; avgPct: number }[]>([]);

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    const load = async () => {
      const dept = selectedDept === "all" ? undefined : selectedDept;
      const [s, r] = await Promise.all([getStats(dept), getAttendance(selectedDate)]);
      setStats(s);
      setDailyRecords(r);
    };
    load();
  }, [selectedDept, selectedDate]);

  useEffect(() => {
    const loadDeptSummary = async () => {
      const summaries = await Promise.all(
        departments.map(async (dept) => {
          const deptStats = await getStats(dept);
          const avgPct = deptStats.length > 0
            ? Math.round(deptStats.reduce((sum, s) => sum + s.percentage, 0) / deptStats.length * 10) / 10
            : 0;
          return { department: dept, count: deptStats.length, avgPct };
        })
      );
      setDeptSummary(summaries);
    };
    if (departments.length > 0) loadDeptSummary();
  }, [departments]);

  const pctColor = (pct: number) => pct >= 75 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
  const pctTextColor = (pct: number) => pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Department Summary Cards */}
      {selectedDept === "all" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {deptSummary.map((d) => (
            <button
              key={d.department}
              onClick={() => setSelectedDept(d.department)}
              className="glass-surface rounded-xl p-4 text-left hover:bg-muted/50 transition-all border border-border"
            >
              <p className="text-xs text-muted-foreground truncate">{d.department}</p>
              <p className="font-display text-xl font-bold mt-1">{d.count}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctColor(d.avgPct)}`} style={{ width: `${d.avgPct}%` }} />
                </div>
                <span className={`text-[0.65rem] font-semibold ${pctTextColor(d.avgPct)}`}>{d.avgPct}%</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detailed Table */}
      <div className="glass-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              {["Faculty", "Department", "Present", "Absent", "Leave", "Attendance %", "In Time", "Out Time"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No data yet.</td></tr>
            ) : (
              stats.map((s) => {
                const dayRecord = dailyRecords[String(s.id)];
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">{s.department}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-success">{s.present}</td>
                    <td className="px-4 py-3 text-sm text-destructive">{s.absent}</td>
                    <td className="px-4 py-3 text-sm text-warning">{s.leave}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pctColor(s.percentage)}`} style={{ width: `${s.percentage}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${pctTextColor(s.percentage)}`}>{s.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dayRecord?.inTime || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dayRecord?.outTime || "—"}</td>
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

export default ReportsTab;
