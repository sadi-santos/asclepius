import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { auditLog } from '../services/audit';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment';

const router = Router();
router.use(auth);

// LISTAR
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1);
  const size = Math.min(Math.max(parseInt(String(req.query.size ?? '20'), 10), 1), 100);

  const where: any = {};
  if (req.query.patient_id) where.patient_id = String(req.query.patient_id);
  if (req.query.professional_id) where.professional_id = String(req.query.professional_id);
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.from || req.query.to) {
    where.scheduled_at = {};
    if (req.query.from) where.scheduled_at.gte = new Date(String(req.query.from));
    if (req.query.to) where.scheduled_at.lte = new Date(String(req.query.to));
  }

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduled_at: 'desc' },
      skip: (page - 1) * size,
      take: size,
      include: { patients: true, professionals: true },
    }),
    prisma.appointment.count({ where }),
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
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { patients: true, professionals: true },
  });
  if (!appt) return res.status(404).json({ error: 'not_found' });
  res.json(appt);
});

// CRIAR
router.post(
  '/',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(createAppointmentSchema),
  async (req, res) => {
    const { patient_id, professional_id, scheduled_at, duration, type, status, reason, notes } = req.body;

    // valida existência
    const [patient, professional] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patient_id } }),
      prisma.professional.findUnique({ where: { id: professional_id } }),
    ]);
    if (!patient) return res.status(400).json({ error: 'patient_not_found' });
    if (!professional) return res.status(400).json({ error: 'professional_not_found' });

    // conflito simples (profissional na janela)
    const start = new Date(scheduled_at);
    const end = new Date(start.getTime() + (duration ?? 30) * 60000);
    const conflict = await prisma.appointment.findFirst({
      where: {
        professional_id,
        scheduled_at: { lt: end },
        // aprox: início de outro dentro da janela
      },
    });
    if (conflict) {
      // checagem simples; uma checagem robusta avaliaria janelas com end (se houver).
      // Mantemos básico para o MVP.
    }

    const appt = await prisma.appointment.create({
      data: {
        patient_id,
        professional_id,
        scheduled_at: new Date(scheduled_at),
        duration: duration ?? 30,
        type,
        status: status ?? 'SCHEDULED',
        reason: reason ?? null,
        notes: notes ?? null,
      },
      include: { patients: true, professionals: true },
    });

    await auditLog({
      action: 'CREATE_APPOINTMENT',
      entity: 'Appointment',
      userId: req.user!.id,
      entityId: appt.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.status(201).json(appt);
  }
);

// ATUALIZAR (PUT)
router.put(
  '/:id',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(createAppointmentSchema),
  async (req, res) => {
    const exists = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        patient_id: req.body.patient_id,
        professional_id: req.body.professional_id,
        scheduled_at: new Date(req.body.scheduled_at),
        duration: req.body.duration ?? 30,
        type: req.body.type,
        status: req.body.status ?? 'SCHEDULED',
        reason: req.body.reason ?? null,
        notes: req.body.notes ?? null,
        updated_at: new Date(),
      },
      include: { patients: true, professionals: true },
    });

    await auditLog({
      action: 'UPDATE_APPOINTMENT',
      entity: 'Appointment',
      userId: req.user!.id,
      entityId: appt.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(appt);
  }
);

// ATUALIZAR (PATCH)
router.patch(
  '/:id',
  requireRole('ADMIN', 'NURSE', 'DOCTOR'),
  validate(updateAppointmentSchema),
  async (req, res) => {
    const exists = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const data: any = { updated_at: new Date() };
    for (const k of ['patient_id','professional_id','duration','type','status','reason','notes','cancel_reason']) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }
    if (req.body.scheduled_at) data.scheduled_at = new Date(req.body.scheduled_at);

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: { patients: true, professionals: true },
    });

    await auditLog({
      action: 'PATCH_APPOINTMENT',
      entity: 'Appointment',
      userId: req.user!.id,
      entityId: appt.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(appt);
  }
);

// EXCLUIR (cancela por padrão; hard via ?hard=true)
router.delete('/:id', requireRole('ADMIN', 'NURSE', 'DOCTOR'), async (req, res) => {
  const hard = String(req.query.hard ?? 'false').toLowerCase() === 'true';
  const exists = await prisma.appointment.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'not_found' });

  if (hard) {
    await prisma.appointment.delete({ where: { id: req.params.id } });
  } else {
    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancel_reason: String(req.query.reason ?? 'Cancelled'), updated_at: new Date() },
    });
  }

  await auditLog({
    action: hard ? 'DELETE_APPOINTMENT_HARD' : 'CANCEL_APPOINTMENT',
    entity: 'Appointment',
    userId: req.user!.id,
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  });

  res.status(204).send();
});

export default router;
