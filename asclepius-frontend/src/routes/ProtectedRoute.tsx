import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

interface Props { children: React.ReactNode; requiredRole?: string; }

export default function ProtectedRoute({ children, requiredRole }: Props){
  const { token, user, isLoading } = useAuth();
  const location = useLocation();
  if(isLoading) return <div className="min-h-[60vh] grid place-items-center"><div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent"/></div>;
  if(!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;
  if(requiredRole && user.role!==requiredRole && user.role!=="ADMIN"){
    return <div className="min-h-[60vh] grid place-items-center text-red-600 font-semibold">Acesso negado</div>;
  }
  return <>{children}</>;
}
