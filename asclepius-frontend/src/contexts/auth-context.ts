import { createContext } from "react";

export type AuthCtx = {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: any) => void;
};

export const AuthContext = createContext<AuthCtx | null>(null);

// adicione isto para resolver o import do useAuth.ts
export type AuthContextType = AuthCtx;
