import { useState, useRef, useCallback, useEffect } from "react";
import { fetchFaculty, markAttendance, type Faculty } from "@/lib/attendance-store";
import { loadFaceModels, getDescriptorFromVideo, getDescriptorFromImage, compareFaces } from "@/lib/face-detection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, UserCheck, AlertCircle, Loader2, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onUpdate: () => void;
}

const FaceVerificationTab = ({ onUpdate }: Props) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [matchResult, setMatchResult] = useState<{ faculty: Faculty; confidence: number } | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [noFace, setNoFace] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Load face models on mount
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreaming(true);
        setMatchResult(null);
        setNoMatch(false);
        setNoFace(false);
        setAttendanceMarked(false);
      }
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access to use face verification.", variant: "destructive" });
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    setMatchResult(null);
    setNoMatch(false);
    setNoFace(false);
    setAttendanceMarked(false);

    try {
      const faculty = await fetchFaculty();
      const myFaculty = faculty.find((f) => f.name === user?.name);

      if (!myFaculty || !myFaculty.photoUrl) {
        setNoMatch(true);
        setCapturing(false);
        toast({ title: "No photo registered", description: "Please upload your profile photo in Settings first.", variant: "destructive" });
        return;
      }

      // Detect face from live camera
      const liveDescriptor = await getDescriptorFromVideo(videoRef.current);

      if (!liveDescriptor) {
        setNoFace(true);
        setCapturing(false);
        toast({ title: "No face detected", description: "Position your face clearly in the camera.", variant: "destructive" });
        return;
      }

      // Get or compute profile face descriptor
      let profileDescriptor: Float32Array | number[] | null = null;

      if (myFaculty.faceDescriptor && myFaculty.faceDescriptor.length > 0) {
        profileDescriptor = myFaculty.faceDescriptor;
      } else {
        profileDescriptor = await getDescriptorFromImage(myFaculty.photoUrl);
        if (!profileDescriptor) {
          setNoMatch(true);
          setCapturing(false);
          toast({ title: "Cannot detect face in profile photo", description: "Please upload a clear face photo.", variant: "destructive" });
          return;
        }
        // Store for future use
        await supabase
          .from("faculty")
          .update({ face_descriptor: Array.from(profileDescriptor) })
          .eq("id", myFaculty.id);
      }

      // Compare faces
      const result = compareFaces(liveDescriptor, profileDescriptor);

      if (!result.match) {
        setNoMatch(true);
        setCapturing(false);
        toast({ title: "Face does not match", description: `Confidence: ${result.confidence}%. Please try again.`, variant: "destructive" });
        return;
      }

      setMatchResult({ faculty: myFaculty, confidence: result.confidence });

      // Auto-mark attendance
      const today = new Date().toISOString().split("T")[0];
      await markAttendance(myFaculty.id, today, "present", "face");
      onUpdate();
      setAttendanceMarked(true);
      toast({ title: `✅ ${myFaculty.name} verified & marked present! (${result.confidence}%)` });
    } catch (err) {
      console.error("Verification error:", err);
      toast({ title: "Verification failed", variant: "destructive" });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-surface rounded-xl p-6">
        <h3 className="font-display font-semibold text-base mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Face Verification Attendance
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          Your live face will be matched against your registered profile photo using AI face recognition.
        </p>

        {/* Model status */}
        {loadingModels && (
          <div className="flex items-center gap-2 text-primary text-xs mb-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading face recognition models...</span>
          </div>
        )}
        {modelsReady && !loadingModels && (
          <div className="flex items-center gap-2 text-success text-xs mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Face recognition ready</span>
          </div>
        )}

        <div className="relative w-full aspect-video bg-muted rounded-xl overflow-hidden mb-4 border border-border">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${streaming ? "" : "hidden"}`} />
          <canvas ref={canvasRef} className="hidden" />
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Camera className="w-12 h-12 opacity-30" />
              <p className="text-sm">Camera is off</p>
            </div>
          )}
          {capturing && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium">Detecting & matching face...</p>
              </div>
            </div>
          )}
          {streaming && !capturing && (
            <>
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-medium bg-background/80 px-2 py-0.5 rounded-full">LIVE</span>
              </div>
              {/* Scanning animation */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-primary/50"
                  animate={{ top: ["5%", "95%", "5%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          {!streaming ? (
            <Button onClick={startCamera} disabled={!modelsReady} className="gradient-bg text-primary-foreground gap-2 flex-1">
              <Camera className="w-4 h-4" /> Start Camera
            </Button>
          ) : (
            <>
              <Button onClick={captureAndVerify} disabled={capturing} className="gradient-bg text-primary-foreground gap-2 flex-1">
                <UserCheck className="w-4 h-4" /> Capture & Verify
              </Button>
              <Button onClick={stopCamera} variant="outline" className="gap-2">
                <StopCircle className="w-4 h-4" /> Stop
              </Button>
            </>
          )}
        </div>

        <AnimatePresence>
          {matchResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="border border-success/30 bg-success/5 rounded-xl p-5">
              <div className="flex items-center gap-4">
                {matchResult.faculty.photoUrl ? (
                  <img src={matchResult.faculty.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-success" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center text-success font-bold">
                    {matchResult.faculty.name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{matchResult.faculty.name}</p>
                  <p className="text-sm text-muted-foreground">{matchResult.faculty.department}</p>
                  <p className="text-xs text-success mt-1">Face Match: {matchResult.confidence}%</p>
                </div>
                {attendanceMarked && (
                  <div className="flex items-center gap-1.5 text-success text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    Marked Present
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {noFace && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="border border-warning/30 bg-warning/5 rounded-xl p-5 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-sm">No face detected</p>
                <p className="text-xs text-muted-foreground">Position your face clearly in the camera and try again.</p>
              </div>
            </motion.div>
          )}
          {noMatch && !noFace && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Face does not match profile</p>
                <p className="text-xs text-muted-foreground">Ensure your registered profile photo is clear. Contact admin if needed.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FaceVerificationTab;
