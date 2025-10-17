import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "@/lib/api";
import type { Patient } from "@/types";
import { CheckCircle2, CircleSlash2, Loader2, Plus, RefreshCw } from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

type PaginatedPatients = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  items: Patient[];
};

function maskCPFForView(cpf: string) {
  const digits = (cpf || "").replace(/\D+/g, "");
  return digits.length === 11
    ? digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
    : cpf;
}

export default function PatientsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const size = 20;

  const queryKey = ["patients", { q, status, page, size }] as const;

  const { data, isFetching, refetch } = useQuery<PaginatedPatients>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        size: String(size),
      };
      if (q.trim()) params.q = q.trim();
      if (status !== "all") params.is_active = status === "active" ? "true" : "false";
      const res = await api.get<PaginatedPatients>("/patients", { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const toggleActive = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
      const res = await api.patch<Patient>(`/patients/${payload.id}`, {
        isActive: payload.isActive,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
    onError: (e) => alert(getErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const empty = !isFetching && items.length === 0;

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-600">Gerencie cadastros de pacientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 inline-flex items-center gap-2 transition-colors"
            title="Atualizar"
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
          <Link
            to="/patients/new"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
            title="Novo paciente"
          >
            <Plus size={16} />
            Novo
          </Link>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Busca e filtros */}
        <div className="p-4 md:p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <input
              className="w-full md:w-96 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Buscar por nome…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="relative">
          {empty ? (
            <div className="py-16 text-center text-slate-500">Nenhum paciente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-6 py-3 text-left font-medium">Nome</th>
                    <th className="px-6 py-3 text-left font-medium">CPF</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <button
                          type="button"
                          className="text-blue-700 hover:underline font-medium"
                          onClick={() => navigate(`/patients/${p.id}/edit`)}
                          title="Editar"
                        >
                          {p.fullName}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-mono">
                        {maskCPFForView(p.cpf)}
                      </td>
                      <td className="px-6 py-3">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={!!p.isActive}
                            onChange={(e) =>
                              toggleActive.mutate({
                                id: p.id,
                                isActive: e.target.checked,
                              })
                            }
                            disabled={toggleActive.isPending}
                          />
                          <span className="text-xs">Cadastro ativo</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isFetching && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-2 text-xs text-slate-600 inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              Atualizando…
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Página <strong className="text-slate-800">{data?.page ?? 1}</strong> de{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                  disabled={(data?.page ?? 1) <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                  disabled={(data?.page ?? 1) >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
