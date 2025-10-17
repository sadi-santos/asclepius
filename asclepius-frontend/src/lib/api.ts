import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
  timeout: 15000,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Normaliza formatos de lista ([], {data:[]}, {items:[]}, {results:[]})
export function toArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.results)) return value.results as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  return [];
}

export function getErrorMessage(e: any): string {
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || "Ocorreu um erro";
}