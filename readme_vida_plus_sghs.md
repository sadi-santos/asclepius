# VidaPlus (SGHSS) — Trilha Backend (Node/Express + Prisma SQLite)

API REST do projeto acadêmico de estudo de caso de um **Sistema de Gestão Hospitalar e de Serviços de Saúde (SGHSS)**, focada na trilha **Back‑end**. Implementação **leve** usando **Node.js + Express + Prisma (SQLite)**, com **autenticação JWT** e **CRUD de Pacientes**. Execução local em máquinas modestas e validação via **REST Client/Thunder Client**.

> **Por que SQLite?** Dispensa Docker/PostgreSQL para desenvolvimento local, de modo leve devido limitação do equipamento disponível. Os mesmos modelos Prisma podem ser usados depois em PostgreSQL, se necessário.

---

## Requisitos

- **Node.js** 18+ (recomendado 20+ LTS)
- **npm** (instalado com o Node)
- **VSCode** (recomendado)
- Extensões úteis (já referenciadas em `.vscode/extensions.json`): Prisma, ESLint, Prettier ESLint, REST Client, Thunder Client, SQLite, SQLTools + SQLite Driver

Verificar versões:

```bash
node -v
npm -v
```

---

## Quickstart

```bash
# 1) Instalar dependências
npm install

# 2) Variáveis de ambiente
cp .env.example .env
# (por padrão, DATABASE_URL=file:./dev.db e PORT=3001)

# 3) Criar banco e gerar Prisma Client
npm run prisma:dev

# 4) Seed de usuário ADMIN (login de teste)
npm run seed:admin
# → admin@vidaplus.com / senha123

# 5) Subir a API
npm run dev
# http://localhost:3001/health → {"status":"ok"}
```

> Se a porta 3001 estiver ocupada, altere `PORT` no `.env` (ex.: 3002) e rode de novo.

---

## Estrutura do projeto

```
sghss-backend/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  └─ env.ts
│  ├─ middlewares/
│  │  └─ auth.ts
│  ├─ repositories/
│  │  └─ prisma.ts
│  └─ routes/
│     ├─ auth.routes.ts
│     └─ patients.routes.ts
├─ prisma/
│  └─ schema.prisma
├─ scripts/
│  └─ seed-admin.ts
├─ .vscode/
│  ├─ settings.json
│  └─ extensions.json
├─ .env.example
├─ package.json
└─ requests.http       # testes via REST Client (opcional)
```

---

## Autenticação

- **Login**: `POST /auth/login`
- **Modelo de usuário**: email único + senha com hash (bcrypt)
- **Token**: JWT (expira em 8h)
- **Proteção**: rotas (exceto `/health` e `/auth/login`) exigem `Authorization: Bearer <token>`

Exemplo de login (REST Client):

```http
POST http://localhost:3001/auth/login
Content-Type: application/json

{ "email":"admin@vidaplus.com", "password":"senha123" }
```

Resposta esperada:

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..." }
```

---

## Endpoints — Pacientes

> Todas as rotas abaixo requerem **Bearer JWT**.

### Criar paciente

```
POST /patients
```

Body JSON:

```json
{
  "fullName": "João Silva",
  "cpf": "12345678900",
  "birthDate": "1990-01-01",
  "email": "joao@example.com",
  "phone": "(11) 99999-0000"
}
```

- **201** → objeto do paciente
- **409** → CPF/email duplicado

### Listar (paginado + busca por nome)

```
GET /patients?page=1&size=20&search=joao
```

Resposta:

```json
{ "items": [ {"id":1, "fullName":"João Silva", ...} ], "total": 1, "page": 1, "size": 20 }
```

### Detalhar

```
GET /patients/:id
```

- **200** → paciente
- **404** → não encontrado

### Atualizar

```
PUT /patients/:id
```

Body (campos opcionais):

```json
{ "fullName": "João A. Silva", "email": "novo@email.com" }
```

- **200** → paciente atualizado
- **404** → não encontrado

### Excluir (somente **ADMIN**)

```
DELETE /patients/:id
```

- **204** → sem corpo
- **404** → não encontrado

---

## Testes rápidos no VSCode

Use o arquivo `requests.http` com a extensão **REST Client**. Exemplo (já incluso):

```http
### Login
POST http://localhost:3001/auth/login
Content-Type: application/json

{ "email":"admin@vidaplus.com", "password":"senha123" }

### Criar paciente (troque {{TOKEN}} após logar)
POST http://localhost:3001/patients
Content-Type: application/json
Authorization: Bearer {{TOKEN}}

{
  "fullName": "João Silva",
  "cpf": "12345678900",
  "birthDate": "1990-01-01",
  "email": "joao@example.com",
  "phone": "(11) 99999-0000"
}

### Listar pacientes
GET http://localhost:3001/patients?page=1&size=20&search=joao
Authorization: Bearer {{TOKEN}}

### Atualizar paciente (id 1)
PUT http://localhost:3001/patients/1
Content-Type: application/json
Authorization: Bearer {{TOKEN}}

{ "fullName": "João A. Silva" }

### Excluir paciente (id 1)
DELETE http://localhost:3001/patients/1
Authorization: Bearer {{TOKEN}}
```

> Alternativa: **Thunder Client** (GUI dentro do VSCode) com as mesmas requisições.

---

## Scripts npm

| Script               | Ação                                       |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Sobe a API em modo desenvolvimento         |
| `npm run prisma:dev` | Aplica migrações e gera o Prisma Client    |
| `npm run seed:admin` | Cria usuário ADMIN padrão (login de teste) |

---

## Variáveis de ambiente

Arquivo `.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="changeme-super-secret"
PORT=3001
```

---

## VSCode (workspace do projeto)

- `.vscode/settings.json`: formatação (Prettier ESLint), ESLint fix on save, formatter Prisma, etc.
- `.vscode/extensions.json`: recomenda as extensões ao abrir o projeto.

> Em Windows (PowerShell), você pode recriar esses arquivos com os comandos fornecidos no guia.

---

## Publicação no GitHub

```bash
git init
git add .
git commit -m "chore: SGHSS backend (Node/Express + Prisma SQLite) initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sghss-backend.git
git push -u origin main
```

Link a ser incluído no **PDF** de entrega do trabalho (não será publicada a API online para este trabalho, execução local).

---

## Checklist - entrega mínima no material orientativo

- Introdução e objetivos do SGHSS (estudo de caso)
- **RF/RNF** (tabelas)
- **Modelagem** (DER/classes/relacionamentos)
- **Implementação** (arquitetura, trechos curtos de código, **link do Git**)
- **Documentação de endpoints** (método, rota, request/response, códigos)
- **Plano de Testes** + **prints** das requisições (REST Client/Thunder)
- Conclusão (lições e melhorias futuras)

---

## Solução de problemas

- \`\` → altere `PORT` no `.env`.
- \`\` → CPF/email duplicado; troque os valores.
- \`\` → refaça login e use `Authorization: Bearer <token>`.
- **CORS (ao integrar front)** → em `src/app.ts`: `app.use(cors({ origin: 'http://localhost:3000' }))`.

---

## (Opcional) Integração com Front Next.js

- `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Criar `lib/api.ts` (funções `login`, `listPatients`, `createPatient`, `updatePatient`, `deletePatient`)
- Em `pages/index.tsx`: remover mocks, fazer login real, usar `api.*` para CRUD

> Guia detalhado de integração está no histórico deste projeto (mensagem “Conectar o Next à API”).

---

## Licença

MIT — uso acadêmico recomendado.

