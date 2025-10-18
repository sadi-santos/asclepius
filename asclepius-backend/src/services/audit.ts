// src/services/audit.ts
import { prisma } from '../config/prisma';

export type AuditLogParams = {
  action: string;
  entity: string;
  userId?: string | null;
  entityId?: string | null;
  details?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function auditLog({
  action,
  entity,
  userId = null,
  entityId = null,
  details = null,
  ip = null,
  userAgent = null,
}: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        // relacione o usuário (preferível) quando houver userId
        ...(userId ? { users: { connect: { id: userId } } } : {}),
        // demais campos em snake_case
        entity_id: entityId ?? undefined,
        details: details ?? undefined,
        ip: ip ?? undefined,
        user_agent: userAgent ?? undefined,
      },
    });
  } catch (err) {
    console.warn('Falha ao registrar auditoria:', err);
  }
}
