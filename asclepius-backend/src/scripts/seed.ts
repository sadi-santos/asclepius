/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  if ((process.env.NODE_ENV ?? 'development') === 'development') {
    await prisma.auditLog.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.professional.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany();
  }

  // usuários (sem 'name')
  await prisma.user.create({
    data: {
      email: 'admin@vidaplus.com',
      password_hash: await hash('VidaPlus@2025', 10),
      role: 'ADMIN',
      is_active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'dra.ana@vidaplus.com',
      password_hash: await hash('senha123', 10),
      role: 'DOCTOR',
      is_active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'enf.carlos@vidaplus.com',
      password_hash: await hash('senha123', 10),
      role: 'NURSE',
      is_active: true,
    },
  });

  // profissionais
  const professional1 = await prisma.professional.create({
    data: {
      full_name: 'Dra. Ana Souza',
      role: 'DOCTOR',
      specialty: 'Cardiologia',
      license_number: 'CRM-SP-123456',
      email: 'dra.ana@vidaplus.com',
      phone: '(11) 98888-0001',
      is_active: true,
    },
  });

  await prisma.professional.create({
    data: {
      full_name: 'Dr. Roberto Lima',
      role: 'DOCTOR',
      specialty: 'Pediatria',
      license_number: 'CRM-SP-234567',
      email: 'dr.roberto@vidaplus.com',
      phone: '(11) 98888-0002',
      is_active: true,
    },
  });

  await prisma.professional.create({
    data: {
      full_name: 'Enf. Carlos Pereira',
      role: 'NURSE',
      specialty: 'Enfermagem Geral',
      license_number: 'COREN-SP-987654',
      email: 'enf.carlos@vidaplus.com',
      phone: '(11) 98888-0003',
      is_active: true,
    },
  });

  // pacientes
  const patient1 = await prisma.patient.create({
    data: {
      full_name: 'João Silva',
      cpf: '12345678900',
      birth_date: new Date('1985-05-20T00:00:00Z'),
      email: 'joao.silva@example.com',
      phone: '(11) 99999-0001',
      address: 'Rua das Flores, 123 - São Paulo/SP',
      blood_type: 'O+',
      allergies: 'Penicilina',
      notes: 'Paciente hipertenso controlado.',
      is_active: true,
    },
  });

  await prisma.patient.create({
    data: {
      full_name: 'Maria Oliveira',
      cpf: '98765432100',
      birth_date: new Date('1992-11-15T00:00:00Z'),
      email: 'maria.oliveira@example.com',
      phone: '(21) 91234-5678',
      address: 'Av. Central, 456 - Rio de Janeiro/RJ',
      blood_type: 'A+',
      notes: 'Paciente diabética tipo 2.',
      is_active: true,
    },
  });

  // agendamento
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      professional_id: professional1.id,
      type: 'CONSULTATION',
      status: 'CONFIRMED',
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Avaliação inicial',
      notes: 'Criado pelo seed',
    },
  });

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
