import { useContext } from "react";
import { AuthContext, type AuthContextType } from "../contexts/auth-context";
export default function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if(!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}