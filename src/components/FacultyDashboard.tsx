import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchFaculty, markAttendance, markOutTime, getAttendance, type Faculty, type AttendanceRecord } from "@/lib/attendance-store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Camera, StopCircle, CheckCircle2, Loader2, LogOut, ChevronDown, Clock, CalendarDays, ScanFace } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onUpdate: () => void;
}

const FacultyDashboard = ({ onUpdate }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [myFaculty, setMyFaculty] = useState<Faculty | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<{ date: string; status: string; inTime?: string; outTime?: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    try {
      const faculty = await fetchFaculty();
      const me = faculty.find((f) => f.name === user?.name);
      setMyFaculty(me || null);

      if (me) {
        const records = await getAttendance(today);
        const rec = records[String(me.id)];
        setTodayRecord(rec || null);
        if (rec) setVerified(true);

        // Load history
        const { data } = await supabase
          .from("attendance_records")
          .select("date, status, in_time, out_time")
          .eq("faculty_id", me.id)
          .order("date", { ascending: false })
          .limit(5);
        setHistory((data || []).map((r) => ({ date: r.date, status: r.status, inTime: r.in_time ?? undefined, outTime: r.out_time ?? undefined })));
      }
    } catch (err) {
      console.error("Failed to load faculty data:", err);
    }
  }, [user?.name, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreaming(true);
      }
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access.", variant: "destructive" });
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const handleVerify = async () => {
    if (!myFaculty || !videoRef.current || !canvasRef.current) return;
    setVerifying(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    await new Promise((r) => setTimeout(r, 1800));

    if (!myFaculty.photoUrl) {
      setVerifying(false);
      toast({ title: "No photo registered", description: "Ask admin to upload your profile photo.", variant: "destructive" });
      return;
    }

    try {
      await markAttendance(myFaculty.id, today, "present", "face");
      setVerified(true);
      stopCamera();
      onUpdate();
      await loadData();
      toast({ title: "✅ Attendance marked successfully!" });
    } catch {
      toast({ title: "Verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkOut = async () => {
    if (!myFaculty) return;
    try {
      await markOutTime(myFaculty.id, today);
      onUpdate();
      await loadData();
      toast({ title: "🕐 Out-time recorded!" });
    } catch {
      toast({ title: "Failed to mark out-time", variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    if (s === "present") return "text-success";
    if (s === "absent") return "text-destructive";
    return "text-warning";
  };

  const statusBg = (s: string) => {
    if (s === "present") return "bg-success/10 border-success/30";
    if (s === "absent") return "bg-destructive/10 border-destructive/30";
    return "bg-warning/10 border-warning/30";
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Face Verification Card */}
      <Card className="overflow-hidden border-border">
        <CardHeader className="pb-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ScanFace className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg font-display">
            {verified ? "Attendance Marked" : "Verify Your Face to Mark Attendance"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!verified && (
            <>
              {/* Camera Preview - Circular */}
              <div className="relative mx-auto w-56 h-56 rounded-full overflow-hidden border-4 border-border bg-muted">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${streaming ? "" : "hidden"}`} />
                <canvas ref={canvasRef} className="hidden" />
                {!streaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-10 h-10 opacity-30" />
                    <p className="text-xs mt-2">Camera off</p>
                  </div>
                )}
                {verifying && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
                {streaming && !verifying && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 bg-background/80 px-2 py-0.5 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[10px] font-medium">LIVE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3">
                {!streaming ? (
                  <Button onClick={startCamera} className="gradient-bg text-primary-foreground gap-2">
                    <Camera className="w-4 h-4" /> Start Scan
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleVerify} disabled={verifying} className="gradient-bg text-primary-foreground gap-2">
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
                      {verifying ? "Verifying..." : "Verify & Mark"}
                    </Button>
                    <Button onClick={stopCamera} variant="outline" size="icon">
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Success Animation */}
          <AnimatePresence>
            {verified && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-3"
                >
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </motion.div>
                <p className="text-success font-semibold font-display text-lg">Attendance Marked Successfully</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Personal Status Card */}
      {myFaculty && (
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              {myFaculty.photoUrl ? (
                <img src={myFaculty.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {myFaculty.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
              )}
              <div>
                <p className="font-display font-bold text-base">{myFaculty.name}</p>
                <p className="text-sm text-muted-foreground">{myFaculty.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Status */}
              <div className={`rounded-lg border p-3 text-center ${todayRecord ? statusBg(todayRecord.status) : "bg-muted border-border"}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <p className={`font-semibold text-sm capitalize ${todayRecord ? statusColor(todayRecord.status) : "text-muted-foreground"}`}>
                  {todayRecord?.status || "—"}
                </p>
              </div>
              {/* In Time */}
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">In Time</p>
                <p className="font-semibold text-sm text-success">{todayRecord?.inTime || "—"}</p>
              </div>
              {/* Out Time */}
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Out Time</p>
                {todayRecord?.outTime ? (
                  <p className="font-semibold text-sm text-destructive">{todayRecord.outTime}</p>
                ) : todayRecord?.status === "present" ? (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={handleMarkOut}>
                    <LogOut className="w-3 h-3" /> Mark Out
                  </Button>
                ) : (
                  <p className="font-semibold text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance History - Collapsible */}
      {history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card className="border-border">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="font-display font-semibold text-sm">Recent Attendance</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {history.map((h, i) => (
                  <motion.div
                    key={h.date}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {h.inTime && <span className="text-xs text-muted-foreground">{h.inTime}</span>}
                      <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full border ${statusBg(h.status)} ${statusColor(h.status)}`}>
                        {h.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default FacultyDashboard;
