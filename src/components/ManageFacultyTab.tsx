import { useState, useEffect, useRef } from "react";
import { loadData, addFaculty, deleteFaculty, updateFacultyPhoto, type Faculty } from "@/lib/attendance-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Camera, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onUpdate: () => void;
}

const ManageFacultyTab = ({ onUpdate }: Props) => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [email, setEmail] = useState("");
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  const refresh = () => {
    setFaculty(loadData().faculty);
    onUpdate();
  };

  useEffect(refresh, []);

  const handleAdd = () => {
    if (!name.trim() || !dept.trim()) return toast({ title: "Name and department are required", variant: "destructive" });
    addFaculty(name.trim(), dept.trim(), email.trim());
    setName(""); setDept(""); setEmail("");
    refresh();
    toast({ title: "✅ Faculty added!" });
  };

  const handleDelete = (id: number) => {
    deleteFaculty(id);
    refresh();
    toast({ title: "Faculty removed" });
  };

  const handlePhoto = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateFacultyPhoto(id, reader.result as string);
      refresh();
      toast({ title: "📸 Photo uploaded!" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add form */}
      <div className="glass-surface rounded-xl p-6">
        <h3 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add New Faculty
        </h3>
        <div className="space-y-3">
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
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="faculty@college.edu" className="bg-muted border-border" />
          </div>
          <Button onClick={handleAdd} className="w-full gradient-bg text-primary-foreground">Add Faculty</Button>
        </div>
      </div>

      {/* Faculty list */}
      <div className="glass-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Faculty</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Photo</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-display font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt={f.name} className="w-9 h-9 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                        {f.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.department}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    ref={(el) => { fileInputRefs.current[f.id] = el; }}
                    type="file"
                    accept="image/*"
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
