import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "faculty";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_USER = { id: "admin-1", email: "subhashcsm@cmrtc.ac.in", password: "subhash123", name: "Dr. Subhash", role: "admin" as const };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("att_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    // Check admin first
    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
      const { password: _, ...userData } = ADMIN_USER;
      setUser(userData);
      localStorage.setItem("att_user", JSON.stringify(userData));
      return true;
    }

    // Check faculty from database
    try {
      const { data, error } = await supabase
        .from("faculty")
        .select("*")
        .eq("email", email)
        .eq("login_password", password)
        .maybeSingle();

      if (!error && data) {
        const userData: User = {
          id: `faculty-${data.id}`,
          email: data.email,
          name: data.name,
          role: "faculty",
        };
        setUser(userData);
        localStorage.setItem("att_user", JSON.stringify(userData));
        return true;
      }
    } catch (err) {
      console.error("Login error:", err);
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("att_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
