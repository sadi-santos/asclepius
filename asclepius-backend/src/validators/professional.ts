import { z } from 'zod';

export const createProfessionalSchema = z.object({
  full_name: z.string().min(3),
  role: z.enum(['DOCTOR','NURSE','STAFF']),
  specialty: z.string().optional(),
  license_number: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateProfessionalSchema = createProfessionalSchema.partial();
