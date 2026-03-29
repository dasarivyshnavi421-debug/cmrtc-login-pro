import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchFaculty, updateFacultyPhoto, type Faculty } from "@/lib/attendance-store";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, CalendarClock, CheckCircle2, XCircle, Clock, Camera, BookOpen, GraduationCap, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { format, addYears, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  recentRecords: { date: string; status: string; inTime?: string; outTime?: string }[];
}

const FacultyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const all = await fetchFaculty();
      const match = all.find((f) => f.name === user?.name);
      if (!match) { setLoading(false); return; }
      setFaculty(match);

      const { data: records } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("faculty_id", match.id)
        .order("date", { ascending: false });

      const recs = records || [];
      const present = recs.filter((r) => r.status === "present").length;
      const absent = recs.filter((r) => r.status === "absent").length;
      const leave = recs.filter((r) => r.status === "leave").length;
      const totalDays = recs.length;

      setSummary({
        totalDays,
        present,
        absent,
        leave,
        percentage: totalDays > 0 ? Math.round((present / totalDays) * 1000) / 10 : 0,
        recentRecords: recs.slice(0, 15).map((r) => ({
          date: r.date,
          status: r.status,
          inTime: r.in_time ?? undefined,
          outTime: r.out_time ?? undefined,
        })),
      });
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const isPhotoUpdateAllowed = !faculty?.profileUpdatedAt || isBefore(addYears(new Date(faculty.profileUpdatedAt), 1), new Date());

  const handlePhotoUpload = (file: File) => {
    if (!faculty) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateFacultyPhoto(faculty.id, reader.result as string);
        toast({ title: "📸 Profile photo updated!" });
        await loadData();
      } catch {
        toast({ title: "Failed to upload photo", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const initials = faculty?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-muted-foreground">
          No faculty profile found for your account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-24 gradient-bg" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                    <AvatarImage src={faculty.photoUrl} alt={faculty.name} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isPhotoUpdateAllowed && (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                      />
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="text-center sm:text-left pb-1 flex-1">
                  <h1 className="text-xl font-display font-bold text-foreground">{faculty.name}</h1>
                  <p className="text-sm text-muted-foreground">{faculty.department}</p>
                </div>
                {!isPhotoUpdateAllowed && faculty.profileUpdatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Photo update available {format(addYears(new Date(faculty.profileUpdatedAt), 1), "dd MMM yyyy")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal Details */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow icon={User} label="Full Name" value={faculty.name} />
              <DetailRow icon={Building2} label="Department" value={faculty.department} />
              <DetailRow icon={Mail} label="Email" value={faculty.email} />
              {faculty.profileUpdatedAt && (
                <DetailRow icon={CalendarClock} label="Photo Updated" value={format(new Date(faculty.profileUpdatedAt), "dd MMM yyyy")} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickStatCard icon={BookOpen} label="Classes Attended" value={summary.present} color="text-emerald-500" />
              <QuickStatCard icon={GraduationCap} label="Classes Held" value={summary.totalDays} color="text-primary" />
              <QuickStatCard icon={BarChart3} label="Total Attendance" value={`${summary.percentage}%`} color="text-amber-500" />
              <QuickStatCard icon={Clock} label="On Leave" value={summary.leave} color="text-muted-foreground" />
            </div>
          </motion.div>
        )}

        {/* Attendance Summary */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Attendance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Attendance percentage bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-semibold text-foreground">{summary.percentage}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-bg transition-all duration-500"
                      style={{ width: `${Math.min(summary.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Recent records */}
                {summary.recentRecords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Recent Records</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {summary.recentRecords.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                          <span className="text-muted-foreground">{format(new Date(r.date), "dd MMM yyyy, EEE")}</span>
                          <div className="flex items-center gap-3">
                            {r.inTime && <span className="text-xs text-muted-foreground">In: {r.inTime}</span>}
                            {r.outTime && <span className="text-xs text-muted-foreground">Out: {r.outTime}</span>}
                            <StatusBadge status={r.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const QuickStatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) => (
  <Card>
    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: React.ElementType; class: string }> = {
    present: { icon: CheckCircle2, class: "text-emerald-500" },
    absent: { icon: XCircle, class: "text-destructive" },
    leave: { icon: Clock, class: "text-amber-500" },
  };
  const c = config[status] || config.absent;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium capitalize ${c.class}`}>
      <c.icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};

export default FacultyProfile;
