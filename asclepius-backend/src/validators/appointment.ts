import { z } from 'zod';

const StatusEnum = z.enum(['SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW']);

const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  scheduled_at: z.coerce.date(), // string ISO -> Date
  duration: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(30),
  type: z.enum(['CONSULTATION', 'TELEMEDICINE', 'EXAM', 'RETURN']),
  status: StatusEnum.optional().default('SCHEDULED'),
  reason: optionalText,
  notes: optionalText,
  cancel_reason: optionalText,
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
