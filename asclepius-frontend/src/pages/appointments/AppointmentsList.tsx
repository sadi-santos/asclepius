import React from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage, toArray } from "../../lib/api";
import type { Appointment, AppointmentStatus, Patient, Professional } from "../../types";
import { PlusCircle, Pencil, Trash2, Search, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const STATUS_PT: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

const TYPE_PT: Record<Appointment["type"], string> = {
  CONSULTATION: "Consulta",
  TELEMEDICINE: "Telemedicina",
  EXAM: "Exame",
  RETURN: "Retorno",
};

export default function AppointmentsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  // padrão: esconder cancelados
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

  const setStatusLocal = (id: string, status: AppointmentStatus) => {
    const prev = qc.getQueryData<Appointment[]>(["appointments"]) || [];
    qc.setQueryData<Appointment[]>(
      ["appointments"],
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  // ======== MUTAÃ‡Ã•ES (nomes sem conflitar com window.confirm) ========
  const confirmMut = useMutation({
    mutationFn: async (id: string) => (await api.post(`/appointments/${id}/confirm`)).data,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      setStatusLocal(id, "CONFIRMED");
    },
    onError: (e) => alert(getErrorMessage(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const completeMut = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/appointments/${id}/complete`, { notes: "Concluído" })).data,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      setStatusLocal(id, "COMPLETED");
    },
    onError: (e) => alert(getErrorMessage(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/appointments/${id}`)).data,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      setStatusLocal(id, "CANCELLED");
    },
    onError: (e) => alert(getErrorMessage(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
  // ===================================================================

  const filtered = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo).getTime() : null;

    return appointments.filter((a) => {
      const p = patients.find((x) => x.id === a.patientId);
      const prof = professionals.find((x) => x.id === a.professionalId);

      const hitQ =
        (p?.fullName || "").toLowerCase().includes(q.toLowerCase()) ||
        (prof?.fullName || "").toLowerCase().includes(q.toLowerCase());

      const t = new Date(a.scheduledAt).getTime();
      const hitFrom = fromMs == null || t >= fromMs;
      const hitTo = toMs == null || t <= toMs;

      const hitStatus =
        statusFilter === "TODOS"
          ? true
          : statusFilter === "ATIVOS"
          ? a.status !== "CANCELLED"
          : a.status === statusFilter;

      return hitQ && hitFrom && hitTo && hitStatus;
    });
  }, [appointments, patients, professionals, q, dateFrom, dateTo, statusFilter]);

  const fmtDateTime = (iso: string) =>
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

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-sm mb-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                placeholder="Buscar por paciente, profissionalâ€¦"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">De</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Até</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as any)}
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

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profissional</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((a: any) => {
                const p = patients.find((x) => x.id === a.patientId);
                const prof = professionals.find((x) => x.id === a.professionalId);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{p?.fullName || "â€”"}</td>
                    <td className="px-6 py-4">{prof?.fullName || "â€”"}</td>
                    <td className="px-6 py-4">{fmtDateTime(a.scheduledAt)}</td>
                    <td className="px-6 py-4">{(TYPE_PT as any)[a.type as any]}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          a.status === "SCHEDULED"
                            ? "bg-blue-100 text-blue-800"
                            : a.status === "CONFIRMED"
                            ? "bg-yellow-100 text-yellow-800"
                            : a.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : a.status === "NO_SHOW"
                            ? "bg-gray-200 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {(STATUS_PT as any)[a.status as any]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/appointments/${a.id}/edit`}
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900 mr-3 align-middle"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </Link>

                      {a.status === "SCHEDULED" && (
                        <button
                          onClick={() => confirmMut.mutate(a.id)}
                          className="inline-flex items-center justify-center text-green-600 hover:text-green-800 mr-3 align-middle"
                          title="Confirmar"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}

                      {a.status === "CONFIRMED" && (
                        <button
                          onClick={() => completeMut.mutate(a.id)}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3 align-middle"
                          title="Concluir"
                        >
                          <ClipboardCheck size={18} />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm(`Cancelar agendamento de ${p?.fullName}?`)) {
                            cancelMut.mutate(a.id);
                          }
                        }}
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-900 align-middle"
                        title="Cancelar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
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







