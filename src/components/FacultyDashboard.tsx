import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchFaculty, markAttendance, markOutTime, getAttendance, updateFaceDescriptor, type Faculty, type AttendanceRecord } from "@/lib/attendance-store";
import { loadFaceModels, getDescriptorFromVideo, getDescriptorFromImage, compareFaces } from "@/lib/face-detection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Camera, StopCircle, CheckCircle2, Loader2, LogOut, ChevronDown, Clock, CalendarDays, ScanFace, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import collegeBg from "@/assets/college-bg.jpg";

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
  const [matchConfidence, setMatchConfidence] = useState(0);
  const [modelsReady, setModelsReady] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [faceMismatch, setFaceMismatch] = useState(false);
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

  // Load face-api models on mount
  useEffect(() => {
    const init = async () => {
      setLoadingModels(true);
      try {
        await loadFaceModels();
        setModelsReady(true);
      } catch (err) {
        console.error("Failed to load face models:", err);
        toast({ title: "Failed to load face recognition models", variant: "destructive" });
      } finally {
        setLoadingModels(false);
      }
    };
    init();
  }, [toast]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreaming(true);
        setNoFaceDetected(false);
        setFaceMismatch(false);
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
    setNoFaceDetected(false);
    setFaceMismatch(false);

    if (!myFaculty.photoUrl) {
      setVerifying(false);
      toast({ title: "No photo registered", description: "Ask admin to upload your profile photo.", variant: "destructive" });
      return;
    }

    try {
      // Get face descriptor from live camera
      const liveDescriptor = await getDescriptorFromVideo(videoRef.current);

      if (!liveDescriptor) {
        setNoFaceDetected(true);
        setVerifying(false);
        toast({ title: "No face detected", description: "Please position your face clearly in the camera.", variant: "destructive" });
        return;
      }

      // Get stored descriptor or compute from profile photo
      let profileDescriptor: Float32Array | number[] | null = null;

      if (myFaculty.faceDescriptor && myFaculty.faceDescriptor.length > 0) {
        profileDescriptor = myFaculty.faceDescriptor;
      } else {
        // Compute from profile photo
        profileDescriptor = await getDescriptorFromImage(myFaculty.photoUrl);
        if (!profileDescriptor) {
          setVerifying(false);
          toast({ title: "Cannot detect face in profile photo", description: "Please ask admin to upload a clear face photo.", variant: "destructive" });
          return;
        }
        // Store descriptor for future use via edge function
        try {
          await updateFaceDescriptor(myFaculty.id, Array.from(profileDescriptor));
        } catch (err) {
          console.error("Failed to store face descriptor:", err);
        }
      }

      // Compare faces
      const result = compareFaces(liveDescriptor, profileDescriptor);

      if (!result.match) {
        setFaceMismatch(true);
        setVerifying(false);
        toast({
          title: "Face does not match",
          description: `Confidence: ${result.confidence}%. Please try again or contact admin.`,
          variant: "destructive",
        });
        return;
      }

      // Match successful - mark attendance
      setMatchConfidence(result.confidence);
      await markAttendance(myFaculty.id, today, "present", "face");
      setVerified(true);
      stopCamera();
      onUpdate();
      await loadData();
      toast({ title: `✅ Face verified! Attendance marked (${result.confidence}% confidence)` });
    } catch (err) {
      console.error("Verification error:", err);
      toast({ title: "Verification failed", description: "An error occurred. Please try again.", variant: "destructive" });
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
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* College Background */}
      <div className="fixed inset-0 -z-10">
        <img src={collegeBg} alt="" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      <div className="max-w-lg mx-auto space-y-6 py-6 px-4">
        {/* Model Loading Indicator */}
        {loadingModels && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3"
          >
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-primary">Loading face recognition models...</span>
          </motion.div>
        )}

        {modelsReady && !loadingModels && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-success text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Face recognition ready</span>
          </motion.div>
        )}

        {/* Face Verification Card */}
        <Card className="overflow-hidden border-border bg-card/95 backdrop-blur-md">
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <ScanFace className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-display">
              {verified ? "Attendance Marked" : "Verify Your Face to Mark Attendance"}
            </CardTitle>
            {!verified && (
              <p className="text-xs text-muted-foreground mt-1">
                Your face will be matched against your registered profile photo
              </p>
            )}
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
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-[10px] text-primary font-medium">Matching face...</p>
                      </div>
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
                  {/* Scanning animation overlay */}
                  {streaming && !verifying && (
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-primary/60"
                        animate={{ top: ["10%", "90%", "10%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-3">
                  {!streaming ? (
                    <Button onClick={startCamera} disabled={!modelsReady} className="gradient-bg text-primary-foreground gap-2">
                      <Camera className="w-4 h-4" /> Start Scan
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleVerify} disabled={verifying} className="gradient-bg text-primary-foreground gap-2">
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
                        {verifying ? "Matching..." : "Verify & Mark"}
                      </Button>
                      <Button onClick={stopCamera} variant="outline" size="icon">
                        <StopCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Error States */}
                <AnimatePresence>
                  {noFaceDetected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4"
                    >
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">No face detected</p>
                        <p className="text-xs text-muted-foreground">Position your face clearly in the camera and try again.</p>
                      </div>
                    </motion.div>
                  )}
                  {faceMismatch && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4"
                    >
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Face does not match profile</p>
                        <p className="text-xs text-muted-foreground">Your face must match your registered profile photo. Contact admin if needed.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  {matchConfidence > 0 && (
                    <p className="text-xs text-success/80 mt-1">Face match: {matchConfidence}% confidence</p>
                  )}
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
          <Card className="border-border bg-card/95 backdrop-blur-md">
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
                <div className={`rounded-lg border p-3 text-center ${todayRecord ? statusBg(todayRecord.status) : "bg-muted border-border"}`}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <p className={`font-semibold text-sm capitalize ${todayRecord ? statusColor(todayRecord.status) : "text-muted-foreground"}`}>
                    {todayRecord?.status || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">In Time</p>
                  <p className="font-semibold text-sm text-success">{todayRecord?.inTime || "—"}</p>
                </div>
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

        {/* Attendance History */}
        {history.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card className="border-border bg-card/95 backdrop-blur-md">
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
    </div>
  );
};

export default FacultyDashboard;
