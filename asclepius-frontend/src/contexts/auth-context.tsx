import React from "react";
import { createContext } from "react";
import type { User } from "../types";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: User) => void;
}
export const AuthContext = createContext<AuthContextType | null>(null);
