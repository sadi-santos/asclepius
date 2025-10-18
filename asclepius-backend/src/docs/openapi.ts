// OpenAPI 3.0.3 – contrato externo em camelCase
// Exposto em /docs (UI) e /openapi.json (JSON)
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Asclepius SGHSS API',
    version: '1.0.0',
    description:
      'API REST do SGHSS. Autorização via JWT Bearer. ' +
      'Contrato externo usa camelCase. Datas ISO-8601 em UTC (sufixo Z).',
  },
  servers: [
    { url: process.env.SWAGGER_SERVER_URL || 'http://localhost:3001' }
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Patients' },
    { name: 'Professionals' },
    { name: 'Appointments' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object' } },
          path: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['ADMIN', 'DOCTOR', 'NURSE', 'STAFF'] },
            },
          },
        },
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          cpf: { type: 'string', minLength: 11, maxLength: 11 },
          birthDate: { type: 'string', format: 'date-time' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          bloodType: { type: 'string', nullable: true },
          allergies: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PatientInput: {
        type: 'object',
        required: ['fullName', 'cpf', 'birthDate'],
        properties: {
          fullName: { type: 'string' },
          cpf: { type: 'string', minLength: 11, maxLength: 11 },
          birthDate: { type: 'string', format: 'date-time' },
          email: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          bloodType: { type: 'string' },
          allergies: { type: 'string' },
          notes: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Professional: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          role: { type: 'string' },
          specialty: { type: 'string', nullable: true },
          licenseNumber: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProfessionalInput: {
        type: 'object',
        required: ['fullName', 'role'],
        properties: {
          fullName: { type: 'string' },
          role: { type: 'string' },
          specialty: { type: 'string' },
          licenseNumber: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      AppointmentStatus: {
        type: 'string',
        enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      },
      AppointmentType: {
        type: 'string',
        enum: ['CONSULTATION', 'TELEMEDICINE', 'EXAM', 'RETURN'],
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', example: 30 },
          type: { $ref: '#/components/schemas/AppointmentType' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          reason: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          cancelReason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AppointmentInput: {
        type: 'object',
        required: ['patientId', 'professionalId', 'scheduledAt', 'type'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', example: 30 },
          type: { $ref: '#/components/schemas/AppointmentType' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          reason: { type: 'string' },
          notes: { type: 'string' },
          cancelReason: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: { description: 'ok' },
        },
      },
    },

    // AUTH
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuário atual',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // PATIENTS
    '/patients': {
      get: {
        tags: ['Patients'],
        security: [{ bearerAuth: [] }],
        summary: 'Listar pacientes',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Patient' } } } } },
        },
      },
      post: {
        tags: ['Patients'],
        security: [{ bearerAuth: [] }],
        summary: 'Criar paciente',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientInput' } } },
        },
        responses: {
          201: { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
          400: { description: 'Erro de validação', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/patients/{id}': {
      get: {
        tags: ['Patients'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Patients'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientInput' } } } },
        responses: {
          200: { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
          400: { description: 'Erro de validação' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Patients'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Removido' }, 404: { description: 'Not found' } },
      },
    },

    // PROFESSIONALS
    '/professionals': {
      get: {
        tags: ['Professionals'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Professional' } } } } },
        },
      },
      post: {
        tags: ['Professionals'],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfessionalInput' } } } },
        responses: {
          201: { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
        },
      },
    },
    '/professionals/{id}': {
      get: {
        tags: ['Professionals'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Professionals'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfessionalInput' } } } },
        responses: {
          200: { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
        },
      },
      delete: {
        tags: ['Professionals'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Removido' }, 404: { description: 'Not found' } },
      },
    },

    // APPOINTMENTS
    '/appointments': {
      get: {
        tags: ['Appointments'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } } } } },
        },
      },
      post: {
        tags: ['Appointments'],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentInput' } } } },
        responses: {
          201: { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
        },
      },
    },
    '/appointments/{id}': {
      get: {
        tags: ['Appointments'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Appointments'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentInput' } } } },
        responses: {
          200: { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
          400: { description: 'Erro de validação' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Appointments'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Removido' }, 404: { description: 'Not found' } },
      },
    },
  },
} as const;
