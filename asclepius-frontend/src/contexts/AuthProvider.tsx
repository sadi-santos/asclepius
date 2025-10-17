import React from "react";
import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../lib/api";
import type { User, AuthResponse } from "../types";
import { AuthContext } from "./auth-context";

interface Props { children: React.ReactNode; }

export default function AuthProvider({ children }: Props){
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if(!token){ setIsLoading(false); return; }
    try{
      const r = await api.get<User>("/auth/me");
      setUser(r.data);
      localStorage.setItem("user", JSON.stringify(r.data));
    }catch{
      localStorage.removeItem("token"); localStorage.removeItem("user");
      setToken(null); setUser(null);
    }finally{ setIsLoading(false); }
  },[token]);

  useEffect(()=>{ fetchUser(); },[fetchUser]);

  const login = async (email: string, password: string) => {
    const r = await api.post<AuthResponse>("/auth/login",{ email, password });
    const t = r.data.token || r.data.access_token;
    if(!t) throw new Error("Token não recebido");
    localStorage.setItem("token", t); setToken(t);
    if(r.data.user){ setUser(r.data.user); localStorage.setItem("user", JSON.stringify(r.data.user)); }
    else { await fetchUser(); }
  };

  const logout = useCallback(()=>{ localStorage.removeItem("token"); localStorage.removeItem("user"); setToken(null); setUser(null); },[]);
  const updateUser = useCallback((u: User)=>{ setUser(u); localStorage.setItem("user", JSON.stringify(u)); },[]);

  return <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}
