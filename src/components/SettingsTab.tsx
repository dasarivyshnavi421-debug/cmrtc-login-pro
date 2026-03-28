import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchFaculty, updateFacultyPhoto, Faculty } from "@/lib/attendance-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, User, Mail, Building2, CalendarClock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { addYears, format, isBefore } from "date-fns";

const SettingsTab = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await fetchFaculty();
        const match = all.find((f) => f.name === user?.name);
        setFaculty(match || null);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const canUpdatePhoto = !faculty?.profileUpdatedAt || isBefore(addYears(new Date(faculty.profileUpdatedAt), 1), new Date()) === false
    ? false
    : true;

  // Recalculate properly
  const isUpdateAllowed = !faculty?.profileUpdatedAt || isBefore(addYears(new Date(faculty.profileUpdatedAt), 1), new Date());

  const nextUpdateDate = faculty?.profileUpdatedAt
    ? format(addYears(new Date(faculty.profileUpdatedAt), 1), "dd MMM yyyy")
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !faculty) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateFacultyPhoto(faculty.id, base64);
        setFaculty((prev) => prev ? { ...prev, photoUrl: base64, profileUpdatedAt: new Date().toISOString() } : null);
        toast.success("Profile photo updated successfully!");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to update photo");
    } finally {
      setUploading(false);
    }
  };

  const initials = faculty?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!faculty) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No faculty profile found for your account.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Photo Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={faculty.photoUrl} alt={faculty.name} />
            <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 text-center sm:text-left">
            {isUpdateAllowed ? (
              <>
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  size="sm"
                >
                  <Camera className="w-4 h-4 mr-1" />
                  {uploading ? "Uploading…" : "Upload Photo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG or PNG, max 2MB. You can update once per year.
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Profile photo locked
                </div>
                <p className="text-xs text-muted-foreground">
                  Next update available on <span className="font-medium text-foreground">{nextUpdateDate}</span>
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Personal Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow icon={User} label="Full Name" value={faculty.name} />
          <DetailRow icon={Building2} label="Department" value={faculty.department} />
          <DetailRow icon={Mail} label="Email" value={faculty.email} />
          {faculty.profileUpdatedAt && (
            <DetailRow
              icon={CalendarClock}
              label="Photo Last Updated"
              value={format(new Date(faculty.profileUpdatedAt), "dd MMM yyyy, hh:mm a")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default SettingsTab;
