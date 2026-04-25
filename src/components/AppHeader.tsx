import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useRef, useState } from "react";

const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isFaculty = user?.role === "faculty";
  const [hideMobileBar, setHideMobileBar] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < 24) setHideMobileBar(false);
        else if (delta > 6) setHideMobileBar(true);
        else if (delta < -6) setHideMobileBar(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: "var(--gradient-surface)" }}>
      {/* Top row: brand + actions */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src="/favicon.png" alt="CMR Technical Campus" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain shrink-0" />
          <span className="font-display font-extrabold text-base sm:text-lg gradient-text truncate">
            CMRTC<span className="text-muted-foreground hidden xs:inline" style={{ WebkitTextFillColor: "hsl(var(--muted-foreground))" }}> Faculty</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Desktop-only profile chip */}
          <button
            onClick={() => {
              if (isFaculty) navigate("/profile");
              else if (user?.role === "admin") navigate("/admin-profile");
            }}
            className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[180px]">{user?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full gradient-bg text-primary-foreground font-medium shrink-0">
              {user?.role}
            </span>
          </button>
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border hidden md:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-9 w-9">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-9 w-9">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile-only full-width profile bar (hides on scroll down) */}
      <div
        className={`sm:hidden border-t border-border/60 px-3 overflow-hidden transition-all duration-300 ease-in-out ${
          hideMobileBar ? "max-h-0 py-0 opacity-0 -translate-y-1 pointer-events-none" : "max-h-20 py-2 opacity-100 translate-y-0"
        }`}
        aria-hidden={hideMobileBar}
        // @ts-expect-error - `inert` is a valid HTML attribute supported by modern browsers
        inert={hideMobileBar ? "" : undefined}
      >
        <button
          onClick={() => {
            if (isFaculty) navigate("/profile");
            else if (user?.role === "admin") navigate("/admin-profile");
          }}
          tabIndex={hideMobileBar ? -1 : 0}
          aria-label={`Open ${user?.name ?? "user"} profile`}
          className="w-full flex items-center gap-2.5 bg-muted/70 hover:bg-accent active:bg-accent transition-colors border border-border rounded-full pl-2 pr-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary-foreground" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-semibold text-foreground leading-tight truncate">
              {user?.name}
            </span>
            <span className="block text-[11px] text-muted-foreground leading-tight truncate">
              {user?.email ?? "View profile"}
            </span>
          </span>
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full gradient-bg text-primary-foreground font-bold shrink-0">
            {user?.role}
          </span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
