````md
# Asclepius SGHSS — Backend (API REST)

Node.js + Express + TypeScript + Prisma + PostgreSQL.  
Contrato externo em **camelCase**. Banco e ORM em **snake_case**. Datas em **ISO-8601 UTC** (sufixo `Z`).

---

## Sumário
- [Arquitetura](#arquitetura)
- [Principais recursos](#principais-recursos)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Scripts NPM](#scripts-npm)
- [Banco de dados](#banco-de-dados)
- [Usuário admin (dev)](#usuário-admin-dev)
- [Execução](#execução)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Testes rápidos end-to-end](#testes-rápidos-end-to-end)
- [Padrões e qualidade](#padrões-e-qualidade)
- [Segurança](#segurança)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Roadmap curto](#roadmap-curto)
- [Licença](#licença)

---

## Arquitetura
- API REST stateless com JWT Bearer.
- Mapeamento de chaves: **request** aceita camelCase, **response** retorna camelCase; camada interna usa snake_case.
- Middlewares: segurança (Helmet), CORS, rate limit, normalização de datas e mapeamento de chaves.
- Persistência: Prisma ORM com PostgreSQL.

## Principais recursos
- Autenticação: `/auth/login`, `/auth/me`.
- Pacientes: CRUD completo.
- Profissionais: CRUD completo.
- Agendamentos: CRUD + transições de status (confirmar, completar, cancelar via rotas/PUT).
- Auditoria de ações (login e operações críticas).

## Stack
- Runtime: Node.js 18+ (recomendado 22).
- Web: Express 4 + express-async-errors, Helmet, CORS, morgan.
- ORM: Prisma 6 + PostgreSQL 16.
- Linguagem: TypeScript 5.
- Validação: Zod.
- Docs: Swagger UI (dev).

## Pré-requisitos
- Node.js e npm.
- PostgreSQL em execução local.
- Criar `.env` a partir de `.env.example`.

## Configuração
1. Clonar o repositório e instalar:
   ```powershell
   npm ci
````

2. Criar `.env` (não versionar). Exemplo:

   ```
   DATABASE_URL=postgresql://asclepius_user:asclepius_2024@localhost:5432/asclepius_dev?schema=public
   JWT_SECRET=CHANGE-ME-32CHARS
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=200
   REQUEST_ACCEPT_CAMEL=true
   RESPONSE_USE_CAMEL=true
   ```
3. Gerar o Prisma Client:

   ```powershell
   npx prisma generate
   ```

## Scripts NPM

```json
{
  "dev": "ts-node-dev --respawn --transpile-only --ignore-watch node_modules src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev --name init",
  "prisma:studio": "prisma studio",
  "prisma:seed": "ts-node src/scripts/seed.ts",
  "db:reset": "prisma migrate reset --force && npm run prisma:seed",
  "user:ensure-admin": "ts-node src/scripts/ensure-admin.ts",
  "test:e2e": "powershell -ExecutionPolicy Bypass -File tests\\test-all.ps1"
}
```

## Banco de dados

* **Schema**: tabelas e colunas em snake_case, mapeadas no Prisma com `@@map`/`@map`.
* **Migrações (dev)**:

  ```powershell
  npx prisma migrate dev
  ```
* **Reset (dev)**:

  ```powershell
  npm run db:reset
  ```

## Usuário admin (dev)

Provisiona o admin sem expor segredos no repositório:

```powershell
$env:ADMIN_EMAIL="<Email>"
$env:ADMIN_PASSWORD="<Password>"
npm run user:ensure-admin
```

Também é possível usar um hash com `$env:ADMIN_PASSWORD_HASH`.

## Execução

* Desenvolvimento:

  ```powershell
  npm run dev
  # Healthcheck
  curl http://localhost:3001/health
  ```
* Produção:

  ```powershell
  npm run build
  npx prisma migrate deploy
  npm start
  ```

## Documentação da API (Swagger)

Ativo somente em `NODE_ENV=development`.

* UI: `http://localhost:3001/docs`
* JSON: `http://localhost:3001/openapi.json`

Arquivo de contrato: `src/docs/openapi.ts`.

## Testes rápidos end-to-end

Script PowerShell cobre **login → CRUDs → status de agendamento → cleanup**.

```powershell
$env:ASCLEPIUS_BASE="http://localhost:3001"
$env:ASCLEPIUS_ADMIN_EMAIL="<Email>"
$env:ASCLEPIUS_ADMIN_PASSWORD="<Password>"
npm run test:e2e
```

Arquivo: `tests/test-all.ps1`.
Observação: o script tolera respostas em snake ou camel.

## Padrões e qualidade

* ESLint + TypeScript strict.
* Logs de requisição com morgan (dev).
* Rate limit configurável por `.env`. Em dev, pode ser desativado por `skip` no middleware.
* Contrato consistente: camelCase no JSON externo; datas ISO-8601 UTC.

## Segurança

* JWT Bearer.
* Helmet e CORS com origem configurável.
* **Não** versionar `.env`. Manter `.env.example` atualizado.
* Rota Swagger exposta só em dev.

## Estrutura de pastas

```
asclepius-backend/
  src/
    config/env.ts
    server.ts
    app.ts
    docs/openapi.ts
    middlewares/
      case-mapping.ts
      iso-dates.ts
      error.ts
    routes/
      auth.routes.ts
      patients.routes.ts
      professionals.routes.ts
      appointments.routes.ts
    scripts/
      seed.ts
      ensure-admin.ts
  prisma/
    schema.prisma
    migrations/
  tests/
    test-all.ps1
  .env.example
  README.md
```

## Roadmap curto

* Regras de agenda: prevenção de sobreposição e janelas de trabalho.
* RBAC por perfil (ADMIN/DOCTOR/NURSE/STAFF).
* Logs estruturados e `requestId`.
* Coleção Postman/Bruno e exemplos no Swagger.
* Integração front-end (React) e CI simples.

## Licença

MIT — ver `LICENSE`.

```
```
