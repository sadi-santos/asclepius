import React from "react";
import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "../../lib/api";
import type { Professional } from "../../types";
import { Check, Loader2, Save, Trash2, X } from "lucide-react";

/** Opções de função (enviamos o código do backend, exibimos PT-BR) */
const FUNCOES = [
  { value: "DOCTOR", label: "Médico(a)" },
  { value: "NURSE", label: "Enfermeiro(a)" },
  { value: "STAFF", label: "Equipe de apoio" },
] as const;

/** Lista simples de especialidades para seleção */
const ESPECIALIDADES = [
  "Clínico Geral",
  "Cardiologia",
  "Dermatologia",
  "Ginecologia",
  "Neurologia",
  "Oftalmologia",
  "Ortopedia",
  "Pediatria",
  "Psiquiatria",
  "Urologia",
  "Fisioterapia",
  "Enfermagem",
];

type FormModel = Omit<Professional, "id"> & { id?: string };

export default function ProfessionalForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: current, isFetching } = useQuery({
    queryKey: ["professionals", id],
    queryFn: async () => (await api.get<Professional>(`/professionals/${id}`)).data,
    enabled: isEdit,
  });

  const initial: FormModel = useMemo(
    () =>
      current
        ? {
            id: current.id,
            fullName: current.fullName ?? "",
            role: current.role ?? "STAFF",
            specialty: current.specialty ?? "",
            licenseNumber: current.licenseNumber ?? "",
            email: current.email ?? "",
            phone: current.phone ?? "",
            isActive: current.isActive ?? true,
          }
        : {
            fullName: "",
            role: "STAFF",
            specialty: "",
            licenseNumber: "",
            email: "",
            phone: "",
            isActive: true,
          },
    [current]
  );

  const [form, setForm] = useState<FormModel>(initial);
  useEffect(() => setForm(initial), [initial]);

  const save = useMutation({
    mutationFn: async (payload: FormModel) =>
      payload.id
        ? (await api.put(`/professionals/${payload.id}`, payload)).data
        : (await api.post(`/professionals`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professionals"] });
      navigate("/professionals");
    },
    onError: (e) => alert(getErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (pid: string) => (await api.delete(`/professionals/${pid}`)).data,
    onMutate: async (pid) => {
      await qc.cancelQueries({ queryKey: ["professionals"] });
      const prev = qc.getQueryData<Professional[]>(["professionals"]) || [];
      qc.setQueryData(
        ["professionals"],
        prev.filter((p) => p.id !== pid)
      );
      return { prev };
    },
    onError: (e, _pid, ctx) => {
      if (ctx?.prev) qc.setQueryData(["professionals"], ctx.prev);
      alert(getErrorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["professionals"] }),
    onSuccess: () => navigate("/professionals"),
  });

  const onChange =
    (field: keyof FormModel) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setForm((f) => ({ ...f, [field]: v as any }));
    };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Editar Profissional" : "Novo Profissional"}
          </h1>
          <p className="text-sm text-gray-600">
            {isEdit ? "Atualize os dados do profissional" : "Cadastre um novo profissional"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              form.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
            title="Status do cadastro"
          >
            {form.isActive ? "Ativo" : "Inativo"}
          </span>

          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (id && confirm(`Excluir o profissional "${form.fullName}"?`)) del.mutate(id);
              }}
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 px-3 py-2 rounded-lg border border-red-200"
              disabled={del.isPending}
              title="Excluir"
            >
              {del.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Excluir
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Nome completo *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.fullName}
              onChange={onChange("fullName")}
              required
              maxLength={120}
              disabled={isFetching || save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Função *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.role}
              onChange={onChange("role")}
              required
              disabled={isFetching || save.isPending}
            >
              {FUNCOES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Especialidade</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.specialty ?? ""}
              onChange={onChange("specialty")}
              disabled={isFetching || save.isPending}
            >
              <option value="">Selecione…</option>
              {ESPECIALIDADES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Nº Registro (CRM/COREN…)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.licenseNumber ?? ""}
              onChange={onChange("licenseNumber")}
              maxLength={30}
              disabled={isFetching || save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">E-mail</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.email ?? ""}
              onChange={onChange("email")}
              maxLength={120}
              disabled={isFetching || save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Telefone</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.phone ?? ""}
              onChange={onChange("phone")}
              placeholder="(11) 90000-0000"
              maxLength={20}
              disabled={isFetching || save.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4"
              checked={form.isActive}
              onChange={onChange("isActive")}
              disabled={isFetching || save.isPending}
            />
            <label htmlFor="isActive" className="text-sm">Cadastro ativo</label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate("/professionals")}
              className="px-4 py-2 border border-gray-300 rounded-lg inline-flex items-center gap-2"
              disabled={save.isPending}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
              disabled={save.isPending}
              title="Salvar"
            >
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>

      {isEdit && current && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Check size={14} className="text-green-600" />
          Carregado do servidor • ID: {current.id}
        </p>
      )}
    </div>
  );
}
