// Auth/User
export type Role = "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";
export interface User { id: string; email: string; role: Role; name?: string; createdAt?: string; updatedAt?: string; }
export interface AuthResponse { token?: string; access_token?: string; user?: User; expiresIn?: number; }

// Domain
export interface Patient {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  email?: string; phone?: string; address?: string;
  bloodType?: string; allergies?: string; notes?: string;
  isActive: boolean; createdAt?: string; updatedAt?: string;
}

export interface Professional {
  id: string;
  fullName: string;
  role: string;
  specialty?: string;
  licenseNumber?: string;
  email?: string; phone?: string;
  isActive: boolean; createdAt?: string; updatedAt?: string;
}

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type AppointmentType   = "CONSULTATION" | "TELEMEDICINE" | "EXAM" | "RETURN";

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  scheduledAt: string; // ISO
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string; notes?: string; duration?: number;
  patient?: Patient; professional?: Professional;
  createdAt?: string; updatedAt?: string;
}