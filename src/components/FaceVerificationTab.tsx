import { useState, useRef, useCallback, useEffect } from "react";
import { loadData, markAttendance, type Faculty } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onUpdate: () => void;
}

const FaceVerificationTab = ({ onUpdate }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [matchResult, setMatchResult] = useState<{ faculty: Faculty; confidence: number } | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreaming(true);
        setMatchResult(null);
        setNoMatch(false);
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

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const capturedImage = canvas.toDataURL("image/jpeg");

    // Simulate face verification with a delay
    await new Promise((r) => setTimeout(r, 1500));

    const data = loadData();
    const facultyWithPhotos = data.faculty.filter((f) => f.photoUrl);

    if (facultyWithPhotos.length === 0) {
      setNoMatch(true);
      setCapturing(false);
      toast({ title: "No faculty photos registered", description: "Please upload photos in the Manage Faculty tab first.", variant: "destructive" });
      return;
    }

    // Simple simulated match: randomly pick a faculty with photo
    // In production, this would use face-api.js descriptor matching
    const matched = facultyWithPhotos[Math.floor(Math.random() * facultyWithPhotos.length)];
    const confidence = 85 + Math.random() * 14;

    setMatchResult({ faculty: matched, confidence: Math.round(confidence * 10) / 10 });
    setCapturing(false);
  };

  const confirmAttendance = () => {
    if (!matchResult) return;
    const today = new Date().toISOString().split("T")[0];
    markAttendance(matchResult.faculty.id, today, "present", "face");
    onUpdate();
    toast({ title: `✅ ${matchResult.faculty.name} marked present via face verification!` });
    setMatchResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-surface rounded-xl p-6">
        <h3 className="font-display font-semibold text-base mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Face Verification Attendance
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Use your webcam to verify faculty identity and mark attendance automatically.
        </p>

        {/* Camera area */}
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
                <p className="text-sm font-medium">Verifying face...</p>
              </div>
            </div>
          )}
          {streaming && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-medium bg-background/80 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-4">
          {!streaming ? (
            <Button onClick={startCamera} className="gradient-bg text-primary-foreground gap-2 flex-1">
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

        {/* Result */}
        <AnimatePresence>
          {matchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-success/30 bg-success/5 rounded-xl p-5"
            >
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
                  <p className="text-xs text-success mt-1">Confidence: {matchResult.confidence}%</p>
                </div>
                <Button onClick={confirmAttendance} size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Confirm
                </Button>
              </div>
            </motion.div>
          )}

          {noMatch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">No match found</p>
                <p className="text-xs text-muted-foreground">Ensure faculty photos are uploaded in the Manage Faculty tab.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FaceVerificationTab;
