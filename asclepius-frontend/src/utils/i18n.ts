import type { AppointmentStatus, AppointmentType } from "../types";

/** Status em PT-BR (cobre exatamente os status do backend) */
export const statusPt: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

/** Tipos em PT-BR (somente os definidos em AppointmentType) */
export const typePt: Record<AppointmentType, string> = {
  CONSULTATION: "Consulta",
  TELEMEDICINE: "Telemedicina",
  EXAM: "Exame",
  RETURN: "Retorno",
};
