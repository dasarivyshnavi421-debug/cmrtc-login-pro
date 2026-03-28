import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchFaculty, getAttendance } from "@/lib/attendance-store";
import AppHeader from "@/components/AppHeader";
import StatsCards from "@/components/StatsCards";
import AttendanceTab from "@/components/AttendanceTab";
import AttendanceHistoryTab from "@/components/AttendanceHistoryTab";
import ReportsTab from "@/components/ReportsTab";
import ManageFacultyTab from "@/components/ManageFacultyTab";
import FaceVerificationTab from "@/components/FaceVerificationTab";
import SettingsTab from "@/components/SettingsTab";
import { motion } from "framer-motion";
import { ClipboardList, BarChart3, Users, ScanFace, History, Settings } from "lucide-react";

const adminTabs = [
  { id: "history", label: "Attendance History", icon: History },
  { id: "report", label: "Reports", icon: BarChart3 },
  { id: "manage", label: "Manage Faculty", icon: Users },
] as const;

const facultyTabs = [
  { id: "attendance", label: "Mark Attendance", icon: ClipboardList },
  { id: "face", label: "Face Verify", icon: ScanFace },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof adminTabs)[number]["id"] | (typeof facultyTabs)[number]["id"];

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleTabs = isAdmin ? adminTabs : facultyTabs;
  const [activeTab, setActiveTab] = useState<TabId>(isAdmin ? "history" : "attendance");
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const updateStats = async () => {
    try {
      const faculty = await fetchFaculty();
      const today = new Date().toISOString().split("T")[0];
      const records = await getAttendance(today);
      const values = Object.values(records);
      setStats({
        total: faculty.length,
        present: values.filter((r) => r.status === "present").length,
        absent: values.filter((r) => r.status === "absent").length,
        leave: values.filter((r) => r.status === "leave").length,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  useEffect(() => { updateStats(); }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StatsCards totalFaculty={stats.total} present={stats.present} absent={stats.absent} onLeave={stats.leave} />

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1.5 w-fit mb-6 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "gradient-bg text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === "history" && <AttendanceHistoryTab />}
          {activeTab === "attendance" && <AttendanceTab key={refreshKey} onUpdate={updateStats} />}
          {activeTab === "face" && <FaceVerificationTab onUpdate={updateStats} />}
          {activeTab === "report" && <ReportsTab key={refreshKey} />}
          {activeTab === "manage" && <ManageFacultyTab onUpdate={updateStats} />}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
