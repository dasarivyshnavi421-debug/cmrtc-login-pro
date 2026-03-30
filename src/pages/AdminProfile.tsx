import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Briefcase, Building2, FileText, ScrollText } from "lucide-react";
import { motion } from "framer-motion";

const AdminProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const adminDetails = {
    name: user?.name || "Dr. Subhash",
    profession: "Associate Professor & HOD",
    department: "Computer Science & Engineering",
    documents: "Faculty Handbook, Academic Calendar 2025-26, Leave Policy Document, Research Guidelines",
    termsAndConditions: `1. All faculty attendance records must be maintained accurately and updated daily.\n2. Admin reserves the right to modify attendance records with proper justification.\n3. Faculty profile photos can only be updated once per academic year.\n4. All exported data is confidential and must be used for official purposes only.\n5. The system must not be shared with unauthorized personnel.\n6. Any discrepancies in attendance must be reported within 48 hours.\n7. Faculty login credentials are managed solely by the admin.\n8. Data retention policy: Records are maintained for a minimum of 5 academic years.`,
  };

  const initials = adminDetails.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-24 gradient-bg" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left pb-1 flex-1">
                  <h1 className="text-xl font-display font-bold text-foreground">{adminDetails.name}</h1>
                  <p className="text-sm text-muted-foreground">Administrator</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal Details */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Admin Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow icon={User} label="Name" value={adminDetails.name} />
              <DetailRow icon={Briefcase} label="Profession" value={adminDetails.profession} />
              <DetailRow icon={Building2} label="Department" value={adminDetails.department} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {adminDetails.documents.split(", ").map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50 border border-border">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{doc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Terms & Conditions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-primary" /> Terms and Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {adminDetails.termsAndConditions.split("\n").map((term, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{term}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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

export default AdminProfile;
