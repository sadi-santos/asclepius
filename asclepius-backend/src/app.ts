import "./types/express-augmentations";
import "./types/express";
// src/app.ts
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { errorHandler } from './middlewares/error';
import { acceptCamelOnRequest, respondCamelOnJson } from './middlewares/case-mapping';
import { normalizeIsoDates } from './middlewares/iso-dates';
import { openapiSpec } from './docs/openapi';

import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patients.routes';
import professionalRoutes from './routes/professionals.routes';
import appointmentRoutes from './routes/appointments.routes';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'development',
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (env.NODE_ENV === 'development') app.use(morgan('dev'));

// CONVERSÃ•ES E NORMALIZAÃ‡Ã•ES ANTES DAS ROTAS:
app.use(acceptCamelOnRequest());
app.use(normalizeIsoDates());
app.use(respondCamelOnJson());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Asclepius SGHSS',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

if (env.NODE_ENV === 'development') {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
}

app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/professionals', professionalRoutes);
app.use('/appointments', appointmentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint nÃ£o encontrado', path: req.path });
});

app.use(errorHandler);
