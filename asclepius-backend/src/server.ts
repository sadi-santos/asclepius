import "./types/express-augmentations";
import "./types/express";
import { app } from './app';
import { env } from './config/env';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log('');
  console.log('==============================================');
  console.log('ASCLEPIUS SGHSS - Sistema de GestÃ£o Hospitalar');
  console.log('==============================================');
  console.log('');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Ambiente: ${env.NODE_ENV}`);
  console.log('');
  console.log('Endpoints principais:');
  console.log('POST   /auth/login');
  console.log('GET    /auth/me');
  console.log('GET    /patients');
  console.log('POST   /patients');
  console.log('GET    /professionals');
  console.log('POST   /appointments');
  console.log('');
  console.log('==============================================');
  console.log('');
});
