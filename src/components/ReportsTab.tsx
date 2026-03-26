import { useEffect, useState } from "react";
import { getStats } from "@/lib/attendance-store";

const ReportsTab = () => {
  const [stats, setStats] = useState<ReturnType<typeof getStats>>([]);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const pctColor = (pct: number) => pct >= 75 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
  const pctTextColor = (pct: number) => pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="glass-surface rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted">
            {["Faculty", "Department", "Present", "Absent", "Leave", "Days", "Attendance %"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No data yet.</td></tr>
          ) : (
            stats.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">{s.department}</span>
                </td>
                <td className="px-4 py-3 text-sm text-success">{s.present}</td>
                <td className="px-4 py-3 text-sm text-destructive">{s.absent}</td>
                <td className="px-4 py-3 text-sm text-warning">{s.leave}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{s.totalDays}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pctColor(s.percentage)}`} style={{ width: `${s.percentage}%` }} />
                    </div>
                    <span className={`text-xs font-semibold ${pctTextColor(s.percentage)}`}>{s.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReportsTab;
