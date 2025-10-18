/* eslint-disable no-console */
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') throw new Error('Bloqueado em produção.');

  const email = process.env.ADMIN_EMAIL ?? 'admin@vidaplus.com';
  const pass = process.env.ADMIN_PASSWORD;
  const passHashEnv = process.env.ADMIN_PASSWORD_HASH;

  if (!pass && !passHashEnv) throw new Error('Defina ADMIN_PASSWORD ou ADMIN_PASSWORD_HASH.');
  const password_hash = passHashEnv ?? await hash(pass as string, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password_hash, role: Role.ADMIN, is_active: true },
    create: { email, password_hash, role: Role.ADMIN, is_active: true },
  });

  console.log('Admin ok:', admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
