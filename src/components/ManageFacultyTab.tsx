import { useState, useEffect, useRef } from "react";
import { fetchFaculty, addFaculty, deleteFaculty, updateFacultyPhoto, updateFaculty, type Faculty } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Camera, Upload, Plus, Pencil, Check, X, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onUpdate: () => void;
}

const ManageFacultyTab = ({ onUpdate }: Props) => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  const refresh = async () => {
    try {
      setFaculty(await fetchFaculty());
      onUpdate();
    } catch (err) {
      console.error("Failed to load faculty:", err);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleAddPhoto = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    if (!name.trim() || !dept.trim() || !email.trim()) return toast({ title: "Name, department and email are required", variant: "destructive" });
    if (!loginPassword.trim()) return toast({ title: "Login password is required for faculty", variant: "destructive" });
    setLoading(true);
    try {
      await addFaculty(name.trim(), dept.trim(), email.trim(), loginPassword.trim(), profilePhoto || undefined);
      setName(""); setDept(""); setEmail(""); setLoginPassword(""); setProfilePhoto(null);
      await refresh();
      toast({ title: "✅ Faculty added with login credentials!" });
    } catch {
      toast({ title: "Failed to add faculty", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFaculty(id);
      await refresh();
      toast({ title: "Faculty removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handlePhoto = (id: number, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateFacultyPhoto(id, reader.result as string);
        await refresh();
        toast({ title: "📸 Photo updated!" });
      } catch {
        toast({ title: "Failed to upload photo", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (f: Faculty) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditDept(f.department);
    setEditEmail(f.email);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || !editDept.trim()) return;
    try {
      await updateFaculty(editingId, editName.trim(), editDept.trim(), editEmail.trim());
      setEditingId(null);
      await refresh();
      toast({ title: "✅ Faculty updated!" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add form */}
      <div className="glass-surface rounded-xl p-6">
        <h3 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add New Faculty
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={profilePhoto || undefined} />
                <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                  {name ? initials(name) : "?"}
                </AvatarFallback>
              </Avatar>
              <input
                ref={addPhotoRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAddPhoto(e.target.files[0])}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => addPhotoRef.current?.click()}>
              <Camera className="w-3.5 h-3.5" /> {profilePhoto ? "Change Photo" : "Upload Photo"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. John Doe" className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Computer Science" className="bg-muted border-border" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="faculty@college.edu" className="bg-muted border-border" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> Login Password *
            </label>
            <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Set faculty login password" className="bg-muted border-border" />
          </div>
          <Button onClick={handleAdd} disabled={loading} className="w-full gradient-bg text-primary-foreground">
            {loading ? "Adding..." : "Add Faculty"}
          </Button>
        </div>
      </div>

      {/* Faculty list */}
      <div className="glass-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Faculty</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Photo</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  {editingId === f.id ? (
                    <div className="space-y-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="h-8 text-sm bg-muted border-border" />
                      <Input value={editDept} onChange={(e) => setEditDept(e.target.value)} placeholder="Department" className="h-8 text-sm bg-muted border-border" />
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="h-8 text-sm bg-muted border-border" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={f.photoUrl} alt={f.name} />
                        <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">{initials(f.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.department}</p>
                        {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    ref={(el) => { fileInputRefs.current[f.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(f.id, e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => fileInputRefs.current[f.id]?.click()}
                  >
                    {f.photoUrl ? <Camera className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                    {f.photoUrl ? "Change" : "Upload"}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {editingId === f.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={saveEdit} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10">
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(f)} className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageFacultyTab;
