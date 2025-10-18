# Asclepius (VidaPlus) — Monorepo

Monorepo com **asclepius-backend** (Node/TypeScript/Prisma/PostgreSQL) e **asclepius-frontend** (Vite/React/Tailwind/Playwright).

> **Sistema operacional alvo deste guia:** Windows (PowerShell).
> Para Git Bash/Wsl, os comandos são equivalentes (troque `Copy-Item` por `cp`, etc.).

---

## Sumário

* [Estrutura do repositório](#estrutura-do-repositório)
* [Requisitos](#requisitos)
* [Instalação](#instalação)
* [Variáveis de ambiente](#variáveis-de-ambiente)
* [Banco de dados (desenvolvimento)](#banco-de-dados-desenvolvimento)
* [Scripts comuns](#scripts-comuns)
* [Testes](#testes)
* [Build](#build)
* [Execução (dev)](#execução-dev)
* [Git: commit & push](#git-commit--push)
* [Boas práticas](#boas-práticas)
* [Licença](#licença)

---

## Estrutura (resumo)

```
asclepius-backend/   # API Node/TS (Prisma + Postgres)
asclepius-frontend/  # Vite/React/Tailwind (Playwright)
pnpm-workspace.yaml  # workspaces
```

---

## Requisitos

* **Node.js 20.x**
* **PNPM 9.x**
* **PostgreSQL** local para desenvolvimento

Instalar PNPM (se ainda não tiver):

```powershell
npm i -g pnpm
pnpm -v
```

---

## Instalação

Na **raiz** do repositório:

```powershell
# instalar as dependências de todas as apps (workspaces)
pnpm install -r

# preparar variáveis de ambiente (não commitar .env)
Copy-Item asclepius-backend\.env.example asclepius-backend\.env -Force

# se houver .env.example no frontend:
# Copy-Item asclepius-frontend\.env.example asclepius-frontend\.env -Force
```

---

## Variáveis de ambiente

### Backend (`asclepius-backend/.env`)

Exemplo (ajuste conforme seu ambiente):

```dotenv
# Porta e ambiente
PORT=3333
NODE_ENV=development
LOG_LEVEL=info

# Postgres (ajuste usuário/senha/host/porta/database)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asclepius?schema=public"

# JWT e outros segredos (apenas para DEV)
JWT_SECRET=dev-secret-change-me
```

> **Importante:** mantenha **apenas** o arquivo **`.env.example`** versionado, **jamais** `.env` com segredos.

### Frontend (`asclepius-frontend/.env`)

Se necessário, crie algo como:

```dotenv
# URL da API em desenvolvimento
VITE_API_URL=http://localhost:3333
```

---

## Banco de dados (desenvolvimento)

1. Garanta o PostgreSQL rodando e crie o DB (se ainda não existir):

```powershell
# usando psql (ajuste o usuário)
psql -U postgres -c "CREATE DATABASE asclepius;"
```

> Caso o `psql` não esteja no PATH do Windows, adicione a pasta `...\PostgreSQL\...\bin` às variáveis de ambiente ou rode o comando a partir dela.

2. Aplicar migrações Prisma:

```powershell
pnpm --filter asclepius-backend prisma migrate deploy
# (opcional) gerar cliente
pnpm --filter asclepius-backend prisma generate
# (opcional) seed, se existir
# pnpm --filter asclepius-backend prisma db seed
```

---

## Scripts comuns

> Os comandos abaixo usam **filtro** por workspace (`--filter`).
> Se você tiver scripts específicos nos `package.json`, pode usá-los diretamente.

* **Instalar dependências (todas as apps):**

  ```powershell
  pnpm install -r
  ```

* **Gerar cliente Prisma (backend):**

  ```powershell
  pnpm --filter asclepius-backend prisma generate
  ```

* **Executar migrações (backend):**

  ```powershell
  pnpm --filter asclepius-backend prisma migrate deploy
  ```

---

## Testes

### Executar tudo (monorepo)

```powershell
pnpm -r test
```

### Backend

```powershell
pnpm --filter asclepius-backend test
```

### Frontend

Instalar navegadores do Playwright (se aplicável):

```powershell
pnpm --filter asclepius-frontend exec playwright install
```

Rodar testes:

```powershell
pnpm --filter asclepius-frontend test
# ou test:e2e / test:ui, conforme seu package.json
```

---

## Build

### Tudo (monorepo)

```powershell
pnpm -r build
```

### Por app

```powershell
pnpm --filter asclepius-backend build
pnpm --filter asclepius-frontend build
```

> Artefatos de build **não** devem ser commitados (o `.gitignore` já cobre `dist/`, `build/`, etc.).

---

## Execução (dev)

Em **terminais separados**:

```powershell
# Backend (API)
pnpm --filter asclepius-backend dev
# API em http://localhost:3333 (ajuste via PORT no .env)

# Frontend (Vite)
pnpm --filter asclepius-frontend dev
# App em http://localhost:5173 (porta padrão do Vite)
```

---

## Git: commit & push

Após editar este README:

```powershell
git add README.md
git commit -m "docs: README raiz com instruções de setup/dev/test/build"
git push
```

---

## Boas práticas

* **Nunca** commitar `.env`, chaves, tokens ou senhas. Use `.env.example`.
* Mantenha **migrações** do Prisma versionadas (úteis para CI/CD e novos devs).
* Use **branches** para features: `feat/...`, `fix/...`, `chore/...`.
* Considere habilitar **Branch Protection** e **CI** (GitHub Actions) para manter a `main` sempre verde.

---

## Licença

Defina aqui a licença do projeto (ex.: MIT).