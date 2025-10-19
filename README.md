# Asclepius (VidaPlus)

Monorepo do sistema hospitalar **Asclepius**, composto por:

- **asclepius-backend** – API REST em Node.js/TypeScript, Prisma ORM e PostgreSQL.
- **asclepius-frontend** – SPA em React (Vite + Tailwind) com testes end-to-end em Playwright.

As instruções a seguir são baseadas em **Windows/PowerShell**, mas funcionam também em Bash/Wsl ajustando pequenas diferenças de comando.

---

## Sumário

- [Requisitos](#requisitos)
- [Clonagem e instalação](#clonagem-e-instalação)
- [Configuração do backend](#configuração-do-backend)
- [Configuração do frontend](#configuração-do-frontend)
- [Execução em desenvolvimento](#execução-em-desenvolvimento)
- [Testes automatizados](#testes-automatizados)
- [Usuários seeds e credenciais úteis](#usuários-seeds-e-credenciais-úteis)
- [Boas práticas de contribuição](#boas-práticas-de-contribuição)

---

## Requisitos

- **Node.js 20.x** (LTS) – confirme com `node -v`.
- **PNPM 9.x** – instale via `npm install -g pnpm`.
- **PostgreSQL 14+** rodando localmente.
- PowerShell 7+ ou terminal equivalente.
- (Opcional para E2E) Navegadores suportados pelo Playwright.

---

## Clonagem e instalação

```powershell
git clone <url-do-repositório>
cd asclepius

# instala dependências de todos os workspaces
pnpm install -r
```

O projeto usa workspaces PNPM; execute os comandos sempre a partir da raiz.

---

## Configuração do backend

### 1. Variáveis de ambiente

Crie o arquivo `asclepius-backend/.env` com valores adequados. Exemplo para desenvolvimento:

```dotenv
DATABASE_URL="postgresql://asclepius_user:asclepius_2024@localhost:5432/asclepius_dev?schema=public"
JWT_SECRET="asclepius-super-secret-key-change-in-production-min-32-chars-2024"
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
REQUEST_ACCEPT_CAMEL=true
RESPONSE_USE_CAMEL=true
```

> ⚠️ Não versionar `.env`. Ajuste os valores conforme suas credenciais locais.

### 2. Banco de dados

1. Crie o banco (se ainda não existir):
   ```powershell
   psql -U postgres -c "CREATE DATABASE asclepius_dev;"
   ```

2. Execute migrações e gere o cliente Prisma:
   ```powershell
   pnpm --filter asclepius-backend prisma migrate deploy
   pnpm --filter asclepius-backend prisma generate
   ```

3. (Recomendado) Popule dados de desenvolvimento:
   ```powershell
   pnpm --filter asclepius-backend prisma:seed
   ```
   O seed cria usuários, profissionais, pacientes e um agendamento exemplo.

4. (Opcional) Garantir um administrador caso personalize o seed:
   ```powershell
   # use ADMIN_EMAIL e ADMIN_PASSWORD ou ADMIN_PASSWORD_HASH
   pnpm --filter asclepius-backend user:ensure-admin
   ```

---

## Configuração do frontend

1. Crie o arquivo `asclepius-frontend/.env` com a URL da API:
   ```dotenv
   VITE_API_BASE_URL=http://localhost:3001
   ```

2. Instale os navegadores do Playwright (necessário para rodar os E2E):
   ```powershell
   pnpm --filter asclepius-frontend exec playwright install
   ```

---

## Execução em desenvolvimento

Abra **dois terminais** na raiz do repositório.

### Backend (API)

```powershell
pnpm --filter asclepius-backend dev
# Servidor disponível em http://localhost:3001
```

### Frontend (SPA)

```powershell
pnpm --filter asclepius-frontend dev
# Aplicação em http://localhost:5173
```

Qualquer alteração em `src/` gera hot reload.

---

## Testes automatizados

### Backend

```powershell
pnpm --filter asclepius-backend test
```

### Frontend – Playwright E2E

Os testes autenticam via `/auth/login`. Utilize as credenciais seeds ou defina as suas via variáveis de ambiente.

```powershell
$env:E2E_AUTH_EMAIL = 'admin@vidaplus.com'
$env:E2E_AUTH_PASSWORD = 'VidaPlus@2025'
pnpm --filter asclepius-frontend test:e2e
```

Variáveis reconhecidas:

- `E2E_AUTH_EMAIL` – e-mail usado no login.
- `E2E_AUTH_PASSWORD` – senha usada no login.
- `E2E_API_BASE_URL` – opcional (padrão `http://localhost:3001`).

Outros scripts úteis:

- `pnpm --filter asclepius-backend build` – transpila o backend para `dist/`.
- `pnpm --filter asclepius-frontend build` – gera bundle de produção.
- `pnpm install -r` – reinstala dependências em todos os workspaces.

---

## Usuários seeds e credenciais úteis

Após rodar `prisma:seed`, os usuários abaixo são criados:

| Função      | E-mail                 | Senha          |
|-------------|------------------------|----------------|
| Admin       | `admin@vidaplus.com`   | `VidaPlus@2025`|
| Médico(a)   | `dra.ana@vidaplus.com` | `senha123`     |
| Enfermeiro  | `enf.carlos@vidaplus.com` | `senha123` |

Essas credenciais são reaproveitadas pelos testes E2E.

---

## Boas práticas de contribuição

- Trabalhe em branches (`feat/...`, `fix/...`, `chore/...`) e abra Pull Requests.
- Não versione arquivos sensíveis ou gerados (`.env`, `dist/`, `playwright-report/`, `test-results/`, etc.).
- Execute migrações e testes antes de abrir PRs relevantes.
- Atualize este README sempre que o processo de setup mudar.

---


