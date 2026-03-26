import { useAuth } from "@/lib/auth-context";
import { LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: "var(--gradient-surface)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-extrabold text-lg gradient-text">
            Faculty<span className="text-muted-foreground" style={{ WebkitTextFillColor: "hsl(var(--muted-foreground))" }}>Attend</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border">
            <User className="w-3.5 h-3.5" />
            <span>{user?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full gradient-bg text-primary-foreground font-medium">
              {user?.role}
            </span>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border hidden md:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
