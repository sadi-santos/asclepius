import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { auditLog } from '../services/audit';
import { createPatientSchema, updatePatientSchema } from '../validators/patient';

const router = Router();
router.use(auth);

// LISTAR (com filtros/paginação)
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1);
  const size = Math.min(Math.max(parseInt(String(req.query.size ?? '20'), 10), 1), 100);

  const where: any = {};
  if (req.query.q) where.full_name = { contains: String(req.query.q), mode: 'insensitive' };
  if (req.query.cpf) where.cpf = String(req.query.cpf);
  if (req.query.is_active !== undefined) where.is_active = String(req.query.is_active).toLowerCase() === 'true';

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.patient.count({ where }),
  ]);

  res.json({
    page,
    size,
    total,
    totalPages: Math.ceil(total / size),
    items,
  });
});

// DETALHE
router.get('/:id', async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!patient) return res.status(404).json({ error: 'not_found' });
  res.json(patient);
});

// CRIAR
router.post(
  '/',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(createPatientSchema),
  async (req, res) => {
    const patient = await prisma.patient.create({
      data: {
        full_name: req.body.full_name,
        cpf: req.body.cpf, // já vem limpo e validado
        birth_date: new Date(req.body.birth_date),
        email: req.body.email ?? null,
        phone: req.body.phone ?? null,
        address: req.body.address ?? null,
        blood_type: req.body.blood_type ?? null,
        allergies: req.body.allergies ?? null,
        notes: req.body.notes ?? null,
        is_active: req.body.is_active ?? true,
      },
    });

    await auditLog({
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      userId: req.user!.id,
      entityId: patient.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.status(201).json(patient);
  }
);

// ATUALIZAR (PUT – completo)
router.put(
  '/:id',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(createPatientSchema),
  async (req, res) => {
    const exists = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        full_name: req.body.full_name,
        cpf: req.body.cpf, // já vem limpo e validado
        birth_date: new Date(req.body.birth_date),
        email: req.body.email ?? null,
        phone: req.body.phone ?? null,
        address: req.body.address ?? null,
        blood_type: req.body.blood_type ?? null,
        allergies: req.body.allergies ?? null,
        notes: req.body.notes ?? null,
        is_active: req.body.is_active ?? true,
        updated_at: new Date(),
      },
    });

    await auditLog({
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      userId: req.user!.id,
      entityId: patient.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(patient);
  }
);

// ATUALIZAR (PATCH – parcial)
router.patch(
  '/:id',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(updatePatientSchema),
  async (req, res) => {
    const exists = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const data: any = { updated_at: new Date() };
    for (const k of [
      'full_name','cpf','email','phone','address','blood_type','allergies','notes','is_active',
    ]) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }
    if (req.body.birth_date) data.birth_date = new Date(req.body.birth_date);

    const patient = await prisma.patient.update({ where: { id: req.params.id }, data });

    await auditLog({
      action: 'PATCH_PATIENT',
      entity: 'Patient',
      userId: req.user!.id,
      entityId: patient.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(patient);
  }
);

// EXCLUIR
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const hard = String(req.query.hard ?? 'false').toLowerCase() === 'true';

  const exists = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'not_found' });

  if (hard) {
    await prisma.patient.delete({ where: { id: req.params.id } });
  } else {
    await prisma.patient.update({
      where: { id: req.params.id },
      data: { is_active: false, updated_at: new Date() },
    });
  }

  await auditLog({
    action: hard ? 'DELETE_PATIENT_HARD' : 'DELETE_PATIENT_SOFT',
    entity: 'Patient',
    userId: req.user!.id,
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  });

  res.status(204).send();
});

export default router;
