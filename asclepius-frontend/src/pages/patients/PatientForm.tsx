import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "../../lib/api";
import type { Patient } from "../../types";
import { Loader2, Save, X } from "lucide-react";
import { validateCPF, onlyDigits, formatCPFView } from "@/utils/cpf";

type FormModel = Omit<Patient, "id" | "cpf" | "birthDate"> & {
  id?: string;
  cpf: string;
  birthDate: string; // yyyy-MM-dd
};

function toDateInput(iso?: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function toISODateAt00Z(yyyyMmDd: string) {
  if (!yyyyMmDd) return new Date().toISOString();
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
}

function toNullableString(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export default function PatientForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: current, isLoading, isError, error } = useQuery({
    queryKey: ["patients", id],
    queryFn: async () => (await api.get<Patient>(`/patients/${id}`)).data,
    enabled: isEdit,
  });

  const initial: FormModel = useMemo(
    () =>
      current
        ? {
            id: current.id,
            fullName: current.fullName || "",
            cpf: onlyDigits(current.cpf || ""),
            birthDate: toDateInput(current.birthDate),
            email: current.email || "",
            phone: current.phone || "",
            address: current.address || "",
            bloodType: current.bloodType || "",
            allergies: current.allergies || "",
            notes: current.notes || "",
            isActive: current.isActive ?? true,
          }
        : {
            fullName: "",
            cpf: "",
            birthDate: "",
            email: "",
            phone: "",
            address: "",
            bloodType: "",
            allergies: "",
            notes: "",
            isActive: true,
          },
    [current]
  );

  const [form, setForm] = useState<FormModel>(initial);
  const [cpfError, setCpfError] = useState<string>("");
  const originalCpfRef = useRef<string>("");

  useEffect(() => {
    const sanitized = { ...initial, cpf: onlyDigits(initial.cpf) };
    setForm((prev) => ({ ...prev, ...sanitized }));
    originalCpfRef.current = sanitized.cpf;
    setCpfError("");
  }, [initial]);

  type SaveInput = { form: FormModel; cpfDigits: string; cpfAlterado: boolean };

  const save = useMutation<Patient, unknown, SaveInput>({
    mutationFn: async ({ form: payload, cpfDigits, cpfAlterado }) => {
      const body: Record<string, unknown> = {
        fullName: payload.fullName.trim(),
        birthDate: toISODateAt00Z(payload.birthDate),
        email: toNullableString(payload.email),
        phone: toNullableString(payload.phone),
        address: toNullableString(payload.address),
        bloodType: toNullableString(payload.bloodType),
        allergies: toNullableString(payload.allergies),
        notes: toNullableString(payload.notes),
        isActive: !!payload.isActive,
      };

      if (!isEdit || cpfAlterado) {
        body.cpf = cpfDigits;
      }

      if (isEdit) {
        const targetId = payload.id ?? id;
        if (!targetId) throw new Error("Paciente sem identificador");
        return (await api.patch<Patient>(`/patients/${targetId}`, body)).data;
      }

      return (await api.post<Patient>("/patients", body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      navigate("/patients");
    },
    onError: (e) => alert(getErrorMessage(e)),
  });

  const onChange =
    (field: keyof FormModel) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const input = e.target as HTMLInputElement;
      const value = input.type === "checkbox" ? input.checked : input.value;
      setForm((prev) => ({
        ...prev,
        [field]: field === "cpf" ? onlyDigits(String(value)).slice(0, 11) : (value as any),
      }));
      if (field === "cpf") setCpfError("");
    };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cpfDigits = onlyDigits(form.cpf);
    const originalCpfDigits = originalCpfRef.current;
    const cpfAlterado = !isEdit || cpfDigits !== originalCpfDigits;
    if (cpfAlterado && !validateCPF(cpfDigits)) {
      setCpfError("CPF inválido");
      return;
    }
    save.mutate({ form, cpfDigits, cpfAlterado });
  };

  if (isEdit && isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" size={20} /> Carregando paciente.
      </div>
    );
  }

  if (isEdit && isError) {
    return (
      <div className="p-8 text-rose-600">
        Falha ao carregar. {String((error as any)?.message ?? "")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEdit ? "Editar Paciente" : "Novo Paciente"}
          </h1>
          <p className="text-sm text-slate-600">
            {isEdit ? "Atualize os dados do paciente" : "Cadastre um novo paciente"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700 mb-1">Nome completo *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.fullName}
              onChange={onChange("fullName")}
              required
              maxLength={120}
              disabled={save.isPending}
            />
          </div>

          <div>
            <label htmlFor="cpf" className="block text-sm text-slate-700 mb-1">
              CPF *
            </label>
            <input
              id="cpf"
              className={`w-full rounded-lg px-3 py-2 outline-none border ${cpfError ? "border-rose-400" : "border-slate-300"} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              value={formatCPFView(form.cpf)}
              onChange={onChange("cpf")}
              inputMode="numeric"
              placeholder="000.000.000-00"
              required
              disabled={save.isPending}
            />
            {cpfError && <p className="text-xs text-rose-600 mt-1">{cpfError}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Data de nascimento *</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.birthDate}
              onChange={onChange("birthDate")}
              required
              disabled={save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.email ?? ""}
              onChange={onChange("email")}
              maxLength={120}
              disabled={save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Telefone</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.phone ?? ""}
              onChange={onChange("phone")}
              placeholder="(11) 90000-0000"
              maxLength={20}
              disabled={save.isPending}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Tipo Sanguíneo</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.bloodType ?? ""}
              onChange={onChange("bloodType")}
              maxLength={3}
              disabled={save.isPending}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700 mb-1">Endereço</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.address ?? ""}
              onChange={onChange("address")}
              maxLength={200}
              disabled={save.isPending}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700 mb-1">Alergias</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.allergies ?? ""}
              onChange={onChange("allergies")}
              maxLength={200}
              disabled={save.isPending}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700 mb-1">Observações</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              value={form.notes ?? ""}
              onChange={onChange("notes")}
              maxLength={500}
              disabled={save.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={!!form.isActive}
              onChange={onChange("isActive")}
              disabled={save.isPending}
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Cadastro ativo
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 inline-flex items-center gap-2"
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
    </div>
  );
}

