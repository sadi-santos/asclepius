// src/validators/patient.ts
import { z } from 'zod';

const cpfDigits = z
  .string()
  .transform((v) => v.replace(/\D+/g, ''))
  .refine((v) => v.length === 11, { message: 'CPF deve ter 11 dígitos' })
  .refine((v) => !/^(\d)\1{10}$/.test(v), { message: 'CPF inválido' })
  .refine((v) => {
    // valida DV
    const d = v.split('').map((n) => parseInt(n, 10));
    let s = 0;
    for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
    let dv1 = 11 - (s % 11);
    if (dv1 > 9) dv1 = 0;
    if (dv1 !== d[9]) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += d[i] * (11 - i);
    let dv2 = 11 - (s % 11);
    if (dv2 > 9) dv2 = 0;
    return dv2 === d[10];
  }, { message: 'CPF inválido' });

const isoDateString = z.string().refine(
  (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v),
  { message: 'Data inválida. Esperado ISO-8601 Z.' }
);

export const createPatientSchema = z.object({
  full_name: z.string().min(1),
  cpf: cpfDigits,
  birth_date: isoDateString,
  email: z.string().email().nullable().optional().transform((v) => v ?? null),
  phone: z.string().nullable().optional().transform((v) => v ?? null),
  address: z.string().nullable().optional().transform((v) => v ?? null),
  blood_type: z.string().nullable().optional().transform((v) => v ?? null),
  allergies: z.string().nullable().optional().transform((v) => v ?? null),
  notes: z.string().nullable().optional().transform((v) => v ?? null),
  is_active: z.boolean().default(true).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();
