import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage, toArray } from "../../lib/api";
import type { Appointment, AppointmentStatus, AppointmentType, Patient, Professional } from "../../types";
import { toIsoFromLocal, toLocalInputValue } from "../../utils/date";
import { Check, X } from "lucide-react";

const STATUS_OPTS: { value: AppointmentStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Agendado" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "NO_SHOW", label: "Falta" },
];

const TYPE_OPTS: { value: AppointmentType; label: string }[] = [
  { value: "CONSULTATION", label: "Consulta" },
  { value: "TELEMEDICINE", label: "Telemedicina" },
  { value: "EXAM", label: "Exame" },
  { value: "RETURN", label: "Retorno" },
];

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

  const { data: appt } = useQuery({
    queryKey: ["appointment", id],
    enabled: isEdit,
    queryFn: async () => (await api.get<Appointment>(`/appointments/${id}`)).data,
  });

  const initialLocalDate = useMemo(
    () => (appt?.scheduledAt ? toLocalInputValue(appt.scheduledAt) : toLocalInputValue()),
    [appt?.scheduledAt]
  );

  const [patientId, setPatientId] = useState(appt?.patientId || "");
  const [professionalId, setProfessionalId] = useState(appt?.professionalId || "");
  const [scheduledLocal, setScheduledLocal] = useState(initialLocalDate);
  const [type, setType] = useState<AppointmentType>(appt?.type || "CONSULTATION");
  const [status, setStatus] = useState<AppointmentStatus>(appt?.status || "SCHEDULED");
  const [reason, setReason] = useState(appt?.reason || "");

  useEffect(() => {
    if (appt) {
      setPatientId(appt.patientId);
      setProfessionalId(appt.professionalId);
      setScheduledLocal(toLocalInputValue(appt.scheduledAt));
      setType(appt.type);
      setStatus(appt.status);
      setReason(appt.reason || "");
    }
  }, [appt]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Partial<Appointment> = {
        patientId,
        professionalId,
        scheduledAt: toIsoFromLocal(scheduledLocal),
        type,
        status,
        reason,
      };
      if (isEdit) {
        return (await api.put(`/appointments/${id}`, payload)).data;
      }
      return (await api.post(`/appointments`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      navigate("/appointments");
    },
    onError: (e) => alert(getErrorMessage(e)),
  });

  const title = isEdit ? "Editar Agendamento" : "Novo Agendamento";

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">{title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Paciente *</label>
          <select
            value={patientId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPatientId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Selecioneâ€¦</option>
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProfessionalId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Selecioneâ€¦</option>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledLocal(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Tipo *</label>
          <select
            value={type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as AppointmentType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            {TYPE_OPTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Status *</label>
          <select
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as AppointmentStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            {STATUS_OPTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Motivo/Notas</label>
          <textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={() => navigate("/appointments")}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <X size={16} /> Cancelar
        </button>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          <Check size={16} />
          {isEdit ? "Salvar alterações" : "Criar agendamento"}
        </button>
      </div>
    </div>
  );
}






