import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";

const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isFaculty = user?.role === "faculty";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: "var(--gradient-surface)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="CMR Technical Campus" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-display font-extrabold text-lg gradient-text">
            CMRTC<span className="text-muted-foreground" style={{ WebkitTextFillColor: "hsl(var(--muted-foreground))" }}> Faculty</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => isFaculty ? navigate("/profile") : undefined}
            className={`hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border ${isFaculty ? "cursor-pointer hover:bg-accent transition-colors" : ""}`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{user?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full gradient-bg text-primary-foreground font-medium">
              {user?.role}
            </span>
          </button>
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border hidden md:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
