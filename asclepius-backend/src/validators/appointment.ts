import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  scheduled_at: z.coerce.date(),     // string ISO -> Date
  duration: z.number().int().positive().optional().default(30),
  type: z.enum(['CONSULTATION','TELEMEDICINE','EXAM','RETURN']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
