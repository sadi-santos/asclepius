import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma
  .$connect()
  .then(() => console.log('PostgreSQL conectado com sucesso'))
  .catch((err: unknown) => {
    console.error('Erro ao conectar no PostgreSQL:', err);
    process.exit(1);
  });
