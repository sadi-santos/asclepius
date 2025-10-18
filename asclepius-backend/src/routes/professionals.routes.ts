import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { auditLog } from '../services/audit';
import { createProfessionalSchema, updateProfessionalSchema } from '../validators/professional';

const router = Router();
router.use(auth);

// LISTAR
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1);
  const size = Math.min(Math.max(parseInt(String(req.query.size ?? '20'), 10), 1), 100);

  const where: any = {};
  if (req.query.q) where.full_name = { contains: String(req.query.q), mode: 'insensitive' };
  if (req.query.role) where.role = String(req.query.role);
  if (req.query.specialty) where.specialty = { contains: String(req.query.specialty), mode: 'insensitive' };
  if (req.query.license_number) where.license_number = String(req.query.license_number);
  if (req.query.is_active !== undefined) where.is_active = String(req.query.is_active).toLowerCase() === 'true';

  const [items, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.professional.count({ where }),
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
  const prof = await prisma.professional.findUnique({ where: { id: req.params.id } });
  if (!prof) return res.status(404).json({ error: 'not_found' });
  res.json(prof);
});

// CRIAR
router.post(
  '/',
  requireRole('ADMIN'),
  validate(createProfessionalSchema),
  async (req, res) => {
    const prof = await prisma.professional.create({
      data: {
        full_name: req.body.full_name,
        role: req.body.role,
        specialty: req.body.specialty ?? null,
        license_number: req.body.license_number ?? null,
        email: req.body.email ?? null,
        phone: req.body.phone ?? null,
        is_active: req.body.is_active ?? true,
      },
    });

    await auditLog({
      action: 'CREATE_PROFESSIONAL',
      entity: 'Professional',
      userId: req.user!.id,
      entityId: prof.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.status(201).json(prof);
  }
);

// ATUALIZAR (PUT)
router.put(
  '/:id',
  requireRole('ADMIN'),
  validate(createProfessionalSchema),
  async (req, res) => {
    const exists = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const prof = await prisma.professional.update({
      where: { id: req.params.id },
      data: {
        full_name: req.body.full_name,
        role: req.body.role,
        specialty: req.body.specialty ?? null,
        license_number: req.body.license_number ?? null,
        email: req.body.email ?? null,
        phone: req.body.phone ?? null,
        is_active: req.body.is_active ?? true,
        updated_at: new Date(),
      },
    });

    await auditLog({
      action: 'UPDATE_PROFESSIONAL',
      entity: 'Professional',
      userId: req.user!.id,
      entityId: prof.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(prof);
  }
);

// ATUALIZAR (PATCH)
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateProfessionalSchema),
  async (req, res) => {
    const exists = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'not_found' });

    const data: any = { updated_at: new Date() };
    for (const k of ['full_name','role','specialty','license_number','email','phone','is_active']) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }

    const prof = await prisma.professional.update({ where: { id: req.params.id }, data });

    await auditLog({
      action: 'PATCH_PROFESSIONAL',
      entity: 'Professional',
      userId: req.user!.id,
      entityId: prof.id,
      details: JSON.stringify(req.body),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(prof);
  }
);

// EXCLUIR
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const hard = String(req.query.hard ?? 'false').toLowerCase() === 'true';

  const exists = await prisma.professional.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'not_found' });

  if (hard) {
    await prisma.professional.delete({ where: { id: req.params.id } });
  } else {
    await prisma.professional.update({
      where: { id: req.params.id },
      data: { is_active: false, updated_at: new Date() },
    });
  }

  await auditLog({
    action: hard ? 'DELETE_PROFESSIONAL_HARD' : 'DELETE_PROFESSIONAL_SOFT',
    entity: 'Professional',
    userId: req.user!.id,
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  });

  res.status(204).send();
});

export default router;
