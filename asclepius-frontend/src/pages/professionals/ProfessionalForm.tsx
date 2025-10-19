import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "../../lib/api";
import type { Professional } from "../../types";
import { Check, Loader2, Save, Trash2, X } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "DOCTOR", label: "Médico(a)" },
  { value: "NURSE", label: "Enfermeiro(a)" },
  { value: "STAFF", label: "Equipe de apoio" },
] as const;

const SPECIALTIES = [
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

const toNullable = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
};

export default function ProfessionalForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: current, isFetching } = useQuery({
    queryKey: ["professionals", id],
    enabled: isEdit,
    queryFn: async () => (await api.get<Professional>(`/professionals/${id}`)).data,
  });

  const initial = useMemo<FormModel>(
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

  const saveMutation = useMutation({
    mutationFn: async (model: FormModel) => {
      const body = {
        fullName: model.fullName.trim(),
        role: model.role,
        specialty: toNullable(model.specialty),
        licenseNumber: toNullable(model.licenseNumber),
        email: toNullable(model.email),
        phone: toNullable(model.phone),
        isActive: !!model.isActive,
      };

      if (model.id) {
        return (await api.put(`/professionals/${model.id}`, body)).data;
      }
      return (await api.post(`/professionals`, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professionals"] });
      navigate("/professionals");
    },
    onError: (error) => alert(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (professionalId: string) => (await api.delete(`/professionals/${professionalId}`)).data,
    onMutate: async (professionalId) => {
      await qc.cancelQueries({ queryKey: ["professionals"] });
      const previous = qc.getQueryData<Professional[]>(["professionals"]);
      if (previous) {
        qc.setQueryData(
          ["professionals"],
          previous.filter((professional) => professional.id !== professionalId)
        );
      }
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(["professionals"], context.previous);
      }
      alert(getErrorMessage(error));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["professionals"] }),
    onSuccess: () => navigate("/professionals"),
  });

  const handleChange =
    (field: keyof FormModel) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value;
      setForm((previous) => ({ ...previous, [field]: value as never }));
    };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "Editar Profissional" : "Novo Profissional"}</h1>
          <p className="text-sm text-gray-600">
            {isEdit ? "Atualize os dados do profissional" : "Cadastre um novo profissional"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/professionals")}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={saveMutation.isPending}
          >
            <X size={16} /> Voltar
          </button>

          {isEdit && form.id && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir ${form.fullName}?`)) deleteMutation.mutate(form.id!);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={16} /> Excluir
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Nome completo *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.fullName}
              onChange={handleChange("fullName")}
              required
              maxLength={120}
              disabled={isFetching || saveMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Função *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.role}
              onChange={handleChange("role")}
              required
              disabled={isFetching || saveMutation.isPending}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Especialidade</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.specialty ?? ""}
              onChange={handleChange("specialty")}
              disabled={isFetching || saveMutation.isPending}
            >
              <option value="">Selecione.</option>
              {SPECIALTIES.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Nº Registro (CRM/COREN)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.licenseNumber ?? ""}
              onChange={handleChange("licenseNumber")}
              maxLength={30}
              disabled={isFetching || saveMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">E-mail</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.email ?? ""}
              onChange={handleChange("email")}
              maxLength={120}
              disabled={isFetching || saveMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Telefone</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.phone ?? ""}
              onChange={handleChange("phone")}
              placeholder="(11) 90000-0000"
              maxLength={20}
              disabled={isFetching || saveMutation.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4"
              checked={form.isActive}
              onChange={handleChange("isActive")}
              disabled={isFetching || saveMutation.isPending}
            />
            <label htmlFor="isActive" className="text-sm">
              Cadastro ativo
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate("/professionals")}
              className="px-4 py-2 border border-gray-300 rounded-lg inline-flex items-center gap-2"
              disabled={saveMutation.isPending}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
              disabled={saveMutation.isPending}
              title="Salvar"
            >
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>

      {isEdit && current && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Check size={14} className="text-green-600" /> Dados carregados do servidor - ID: {current.id}
        </p>
      )}
    </div>
  );
}
