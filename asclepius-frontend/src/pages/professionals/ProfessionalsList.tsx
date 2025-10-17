import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage, toArray } from "../../lib/api";
import type { Professional } from "../../types";
import { PlusCircle, Pencil, Trash2, Search, Filter, User } from "lucide-react";

export default function ProfessionalsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(true);

  const { data: professionals = [], isFetching } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => toArray<Professional>((await api.get("/professionals")).data),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/professionals/${id}`)).data,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["professionals"] });
      const prev = qc.getQueryData<Professional[]>(["professionals"]) || [];
      qc.setQueryData<Professional[]>(
        ["professionals"],
        prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
      );
      return { prev };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["professionals"], ctx.prev);
      alert(getErrorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["professionals"] }),
  });

  const filtered = professionals.filter((p) => {
    const hitQ =
      p.fullName.toLowerCase().includes(q.toLowerCase()) ||
      (p.licenseNumber || "").includes(q) ||
      (p.email || "").toLowerCase().includes(q.toLowerCase());
    const hitActive = filterActive === null || p.isActive === filterActive;
    return hitQ && hitActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-sm text-gray-600">Gerencie os profissionais do sistema</p>
        </div>
        <button
          onClick={() => navigate("/professionals/new")}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Novo Profissional
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, CRM/COREN ou e-mail…"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterActive(true)}
              className={`px-4 py-2 rounded-lg border inline-flex items-center gap-2 ${
                filterActive === true
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title="Somente ativos"
            >
              <Filter size={18} />
              Ativos
            </button>
            <button
              onClick={() => setFilterActive(null)}
              className={`px-4 py-2 rounded-lg border inline-flex items-center gap-2 ${
                filterActive === null
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title="Todos"
            >
              Todos
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`px-4 py-2 rounded-lg border inline-flex items-center gap-2 ${
                filterActive === false
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title="Somente inativos"
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Profissional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Especialidade / Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={18} className="text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{p.fullName}</div>
                        <div className="text-sm text-gray-500">
                          Registro: {p.licenseNumber || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{p.specialty || "—"}</div>
                    <div className="text-xs text-gray-500">
                      Função:{" "}
                      {p.role === "DOCTOR"
                        ? "Médico(a)"
                        : p.role === "NURSE"
                        ? "Enfermeiro(a)"
                        : "Equipe de apoio"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{p.email || "—"}</div>
                    <div className="text-sm text-gray-500">{p.phone || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        p.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {p.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      to={`/professionals/${p.id}/edit`}
                      className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900 mr-3 align-middle"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir ${p.fullName}?`)) del.mutate(p.id);
                      }}
                      className="inline-flex items-center justify-center text-red-600 hover:text-red-900 align-middle"
                      title="Excluir"
                      disabled={del.isPending}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Nenhum profissional encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
