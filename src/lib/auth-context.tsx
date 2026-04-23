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
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("att_user");
    return saved ? JSON.parse(saved) : null;
  });

  const getToken = useCallback(() => {
    return localStorage.getItem("att_token");
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("login", {
        body: { email, password },
      });

      if (error || !data?.user) {
        return false;
      }

      setUser(data.user);
      localStorage.setItem("att_user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("att_token", data.token);
      }
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("att_user");
    localStorage.removeItem("att_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
