import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage, toArray } from "../../lib/api";
import type { Appointment, AppointmentStatus, Patient, Professional } from "../../types";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

const TYPE_LABEL: Record<Appointment["type"], string> = {
  CONSULTATION: "Consulta",
  TELEMEDICINE: "Telemedicina",
  EXAM: "Exame",
  RETURN: "Retorno",
};

export default function AppointmentsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "TODOS" | "ATIVOS">("ATIVOS");

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => toArray<Appointment>((await api.get("/appointments")).data),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => toArray<Patient>((await api.get("/patients")).data),
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => toArray<Professional>((await api.get("/professionals")).data),
  });

  const updateStatusOptimistic = (appointmentId: string, status: AppointmentStatus) => {
    const previous = qc.getQueryData<Appointment[]>(["appointments"]) ?? [];
    qc.setQueryData<Appointment[]>(
      ["appointments"],
      previous.map((item) => (item.id === appointmentId ? { ...item, status } : item))
    );
  };

  const confirmMutation = useMutation({
    mutationFn: async (appointmentId: string) =>
      (await api.patch(`/appointments/${appointmentId}`, { status: "CONFIRMED" })).data,
    onMutate: async (appointmentId) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      updateStatusOptimistic(appointmentId, "CONFIRMED");
    },
    onError: (error) => alert(getErrorMessage(error)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const completeMutation = useMutation({
    mutationFn: async (appointmentId: string) =>
      (await api.patch(`/appointments/${appointmentId}`, { status: "COMPLETED", notes: "Concluído" })).data,
    onMutate: async (appointmentId) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      updateStatusOptimistic(appointmentId, "COMPLETED");
    },
    onError: (error) => alert(getErrorMessage(error)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => (await api.delete(`/appointments/${appointmentId}`)).data,
    onMutate: async (appointmentId) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      updateStatusOptimistic(appointmentId, "CANCELLED");
    },
    onError: (error) => alert(getErrorMessage(error)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const filteredAppointments = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo).getTime() : null;

    const normalize = (value: string) => value.toLowerCase();

    return appointments.filter((appointment) => {
      const patient = patients.find((item) => item.id === appointment.patientId);
      const professional = professionals.find((item) => item.id === appointment.professionalId);

      const matchesQuery =
        normalize(patient?.fullName ?? "").includes(normalize(query)) ||
        normalize(professional?.fullName ?? "").includes(normalize(query));

      const scheduledAt = new Date(appointment.scheduledAt).getTime();
      const withinFrom = fromMs == null || scheduledAt >= fromMs;
      const withinTo = toMs == null || scheduledAt <= toMs;

      const matchesStatus =
        statusFilter === "TODOS"
          ? true
          : statusFilter === "ATIVOS"
          ? appointment.status !== "CANCELLED"
          : appointment.status === statusFilter;

      return matchesQuery && withinFrom && withinTo && matchesStatus;
    });
  }, [appointments, patients, professionals, query, dateFrom, dateTo, statusFilter]);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm text-gray-600">Gerencie consultas e procedimentos</p>
        </div>
        <button
          onClick={() => navigate("/appointments/new")}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Novo Agendamento
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-sm mb-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Buscar por paciente ou profissional..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">De</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDateFrom(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Até</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDateTo(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setStatusFilter(event.target.value as AppointmentStatus | "TODOS" | "ATIVOS")
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="ATIVOS">Ativos (sem cancelados)</option>
              <option value="TODOS">Todos</option>
              <option value="SCHEDULED">Agendado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="COMPLETED">Concluído</option>
              <option value="NO_SHOW">Falta</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agendamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profissional</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => {
                const patient = patients.find((item) => item.id === appointment.patientId);
                const professional = professionals.find((item) => item.id === appointment.professionalId);

                return (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{TYPE_LABEL[appointment.type]}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(appointment.scheduledAt)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{patient?.fullName ?? "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{professional?.fullName ?? "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          appointment.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : appointment.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {STATUS_LABEL[appointment.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/appointments/${appointment.id}/edit`}
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </Link>

                      <button
                        onClick={() => confirmMutation.mutate(appointment.id)}
                        className="inline-flex items-center justify-center text-emerald-600 hover:text-emerald-800"
                        title="Confirmar"
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle2 size={16} />
                      </button>

                      <button
                        onClick={() => completeMutation.mutate(appointment.id)}
                        className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800"
                        title="Concluir"
                        disabled={completeMutation.isPending}
                      >
                        <ClipboardCheck size={16} />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm("Cancelar agendamento?")) cancelMutation.mutate(appointment.id);
                        }}
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                        title="Cancelar"
                        disabled={cancelMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Nenhum agendamento encontrado.
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

