import React, { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage, toArray } from "../../lib/api";
import type { Appointment, AppointmentStatus, AppointmentType, Patient, Professional } from "../../types";
import { toIsoFromLocal, toLocalInputValue } from "../../utils/date";
import { Check, Loader2, X } from "lucide-react";

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Agendado" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "NO_SHOW", label: "Falta" },
];

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "CONSULTATION", label: "Consulta" },
  { value: "TELEMEDICINE", label: "Telemedicina" },
  { value: "EXAM", label: "Exame" },
  { value: "RETURN", label: "Retorno" },
];

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function AppointmentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => toArray<Patient>((await api.get("/patients")).data),
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => toArray<Professional>((await api.get("/professionals")).data),
  });

  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ["appointment", id],
    enabled: isEdit,
    queryFn: async () => (await api.get<Appointment>(`/appointments/${id}`)).data,
  });

  const initialLocalDate = useMemo(
    () => (appointment?.scheduledAt ? toLocalInputValue(appointment.scheduledAt) : toLocalInputValue()),
    [appointment?.scheduledAt]
  );

  const [patientId, setPatientId] = useState<string>(appointment?.patientId ?? "");
  const [professionalId, setProfessionalId] = useState<string>(appointment?.professionalId ?? "");
  const [scheduledLocal, setScheduledLocal] = useState<string>(initialLocalDate);
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? "CONSULTATION");
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? "SCHEDULED");
  const [reason, setReason] = useState<string>(appointment?.reason ?? "");

  useEffect(() => {
    if (!appointment) return;
    setPatientId(appointment.patientId);
    setProfessionalId(appointment.professionalId);
    setScheduledLocal(toLocalInputValue(appointment.scheduledAt));
    setType(appointment.type);
    setStatus(appointment.status);
    setReason(appointment.reason ?? "");
  }, [appointment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!patientId || !professionalId) {
        throw new Error("Selecione paciente e profissional.");
      }

      const payload = {
        patientId,
        professionalId,
        scheduledAt: toIsoFromLocal(scheduledLocal),
        type,
        status,
        reason: toNullable(reason) ?? undefined,
      } satisfies Partial<Appointment> &
        Pick<Appointment, "patientId" | "professionalId" | "scheduledAt" | "type" | "status">;

      if (isEdit) {
        return (await api.put(`/appointments/${id}`, payload)).data;
      }
      return (await api.post(`/appointments`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      navigate("/appointments");
    },
    onError: (error) => alert(getErrorMessage(error)),
  });

  const onSelectChange = (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLSelectElement>) => setter(event.target.value);

  const onInputChange = (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setter(event.target.value);

  const title = isEdit ? "Editar Agendamento" : "Novo Agendamento";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">{title}</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Paciente *</label>
          <select
            value={patientId}
            onChange={onSelectChange(setPatientId)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
            disabled={saveMutation.isPending || isLoadingAppointment}
          >
            <option value="">Selecione...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Profissional *</label>
          <select
            value={professionalId}
            onChange={onSelectChange(setProfessionalId)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
            disabled={saveMutation.isPending || isLoadingAppointment}
          >
            <option value="">Selecione...</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Data/Hora *</label>
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={onInputChange(setScheduledLocal)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
            disabled={saveMutation.isPending}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Tipo *</label>
          <select
            value={type}
            onChange={onSelectChange((value) => setType(value as AppointmentType))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
            disabled={saveMutation.isPending}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Status *</label>
          <select
            value={status}
            onChange={onSelectChange((value) => setStatus(value as AppointmentStatus))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
            disabled={saveMutation.isPending}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Motivo/Notas</label>
          <textarea
            value={reason}
            onChange={onInputChange(setReason)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Informe detalhes adicionais, se necessário."
            disabled={saveMutation.isPending}
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/appointments")}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={saveMutation.isPending}
          >
            <X size={16} /> Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isEdit ? "Salvar alterações" : "Criar agendamento"}
          </button>
        </div>
      </form>

      {isEdit && appointment && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-4">
          <Check size={14} className="text-green-600" />
          Dados carregados do servidor · ID: {appointment.id}
        </p>
      )}
    </div>
  );
}
