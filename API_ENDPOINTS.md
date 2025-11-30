# Documentacao dos Endpoints - Asclepius SGHSS

Todas as rotas abaixo estao expostas pela API REST do backend (`http://localhost:3001` em desenvolvimento) e retornam/con-somem JSON. Os exemplos assumem autenticacao JWT (Bearer) obtida via `/auth/login` e refletem o contrato camelCase exibido no Swagger (`/docs`).

---

## Auth

### POST `/auth/login`
- **Objetivo:** autenticar usuario e emitir token JWT.
- **Body JSON:**
  ```json
  {
    "email": "admin@vidaplus.com",
    "password": "VidaPlus@2025"
  }
  ```
- **Resposta 200:**
  ```json
  {
    "token": "<jwt>",
    "user": {
      "id": "6e4b4c05-7ff6-4b45-b32f-2e29289c1b39",
      "email": "admin@vidaplus.com",
      "role": "ADMIN"
    }
  }
  ```
- **Erros comuns:** `400 missing_credentials`, `401 invalid_credentials`, `429 too_many_requests`.

### GET `/auth/me`
- **Objetivo:** retornar snapshot do usuario autenticado.
- **Headers:** `Authorization: Bearer <token>`.
- **Resposta 200:**
  ```json
  {
    "id": "6e4b4c05-7ff6-4b45-b32f-2e29289c1b39",
    "email": "admin@vidaplus.com",
    "role": "ADMIN",
    "is_active": true,
    "last_login_at": "2025-10-19T13:02:11.123Z",
    "created_at": "2025-09-01T12:00:00.000Z"
  }
  ```
- **Erros:** `401 unauthorized`, `404 not_found`.

---

## Health

### GET `/health`
- **Objetivo:** verificar se o servico esta disponivel.
- **Resposta 200:**
  ```json
  {
    "status": "ok",
    "service": "Asclepius SGHSS",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2025-10-19T16:35:20.456Z"
  }
  ```

---

## Patients

### GET `/patients`
- **Objetivo:** listar pacientes com filtros e paginacao.
- **Query params:**
  - `page` (numero, padrao 1)
  - `size` (1-100, padrao 20)
  - `q` (texto parcial no nome)
  - `cpf` (CPF completo)
  - `is_active` (`true`/`false`)
- **Resposta 200:**
  ```json
  {
    "page": 1,
    "size": 20,
    "total": 54,
    "totalPages": 3,
    "items": [
      {
        "id": "8f4d6bb3-e6cd-4a35-928e-d1c93691f3aa",
        "fullName": "Ana Costa",
        "cpf": "12345678901",
        "birthDate": "1995-04-01T00:00:00.000Z",
        "email": "ana@example.com",
        "phone": "5511999999999",
        "address": "Rua A, 100",
        "bloodType": "A+",
        "allergies": null,
        "notes": null,
        "isActive": true,
        "createdAt": "2025-10-18T14:10:33.000Z",
        "updatedAt": "2025-10-18T14:10:33.000Z"
      }
    ]
  }
  ```

### POST `/patients`
- **Objetivo:** cadastrar paciente.
- **Body JSON (snake_case aceito pelo middleware):**
  ```json
  {
    "full_name": "Paciente QA",
    "cpf": "98765432100",
    "birth_date": "1996-09-23T00:00:00.000Z",
    "email": "paciente@exemplo.com",
    "phone": "+55 11 98888-7777",
    "address": "Rua Teste, 123",
    "blood_type": "O-",
    "allergies": "Lactose",
    "notes": "Observacoes",
    "is_active": true
  }
  ```
- **Resposta 201:** objeto `Patient`.
- **Erros:** `400 validation_error` (CPF invalido, data fora de ISO).

### GET `/patients/{id}`
- **Objetivo:** detalhar paciente.
- **Resposta 200:** objeto `Patient`.
- **Erros:** `404 not_found`.

### PUT `/patients/{id}`
- **Objetivo:** atualizar cadastro completo.
- **Body:** mesmo schema do POST.
- **Resposta 200:** objeto atualizado.

### PATCH `/patients/{id}`
- **Objetivo:** atualizacao parcial (qualquer subset de campos).
- **Body exemplo:**
  ```json
  { "phone": "+55 11 97777-1111", "is_active": false }
  ```
- **Resposta 200:** objeto atualizado.

### DELETE `/patients/{id}`
- **Objetivo:** excluir paciente.
- **Query param opcional:** `hard=true` para delecao definitiva; padrao aplica soft delete (`is_active=false`).
- **Resposta 204:** sem corpo.

---

## Professionals

### GET `/professionals`
- Lista com filtros (`page`, `size`, `q`, `role`, `specialty`, `license_number`, `is_active`).
- **Resposta 200:** paginacao semelhante a `/patients`, com campos `fullName`, `role`, `specialty`, `licenseNumber`, `email`, `phone`, `isActive`.

### POST `/professionals`
- **Body:**
  ```json
  {
    "full_name": "Dra. QA",
    "role": "DOCTOR",
    "specialty": "Clinica Geral",
    "license_number": "CRM-12345",
    "email": "dra.qa@example.com",
    "phone": "+55 11 3444-5566",
    "is_active": true
  }
  ```
- **Resposta 201:** profissional criado.

### GET `/professionals/{id}`
- Retorna profissional (200) ou `404`.

### PUT `/professionals/{id}`
- Atualiza todos os campos (payload igual ao POST).

### PATCH `/professionals/{id}`
- Atualizacao parcial. Ex.: `{ "is_active": false }`.

### DELETE `/professionals/{id}`
- Remove registro. Query `hard=true` segue mesma logica de pacientes.
- **Resposta 204.**

---

## Appointments

### GET `/appointments`
- **Objetivo:** listar agendamentos.
- **Query params:** `page`, `size`, `patient_id`, `professional_id`, `status`, `from`, `to`.
- **Resposta 200:**
  ```json
  {
    "page": 1,
    "size": 20,
    "total": 5,
    "totalPages": 1,
    "items": [
      {
        "id": "62f4d8c3-8183-4aa8-8cd5-88427ac4a2a8",
        "patientId": "8f4d6bb3-e6cd-4a35-928e-d1c93691f3aa",
        "professionalId": "5c1d6bd2-04ac-4d3b-91ba-5b1f5a5062db",
        "scheduledAt": "2025-10-20T15:30:00.000Z",
        "duration": 30,
        "type": "CONSULTATION",
        "status": "CONFIRMED",
        "reason": "Retorno",
        "notes": null,
        "cancelReason": null,
        "createdAt": "2025-10-18T15:15:00.000Z",
        "updatedAt": "2025-10-18T15:15:00.000Z",
        "patients": { "...": "dados do paciente" },
        "professionals": { "...": "dados do profissional" }
      }
    ]
  }
  ```

### POST `/appointments`
- **Body:**
  ```json
  {
    "patient_id": "8f4d6bb3-e6cd-4a35-928e-d1c93691f3aa",
    "professional_id": "5c1d6bd2-04ac-4d3b-91ba-5b1f5a5062db",
    "scheduled_at": "2025-10-21T18:00:00.000Z",
    "duration": 45,
    "type": "CONSULTATION",
    "status": "SCHEDULED",
    "reason": "Consulta automatizada",
    "notes": "Observacoes"
  }
  ```
- **Resposta 201:** inclui `patients` e `professionals` relacionados.
- **Erros:** `400 patient_not_found`, `400 professional_not_found`, `400 validation_error`.

### GET `/appointments/{id}`
- Retorna agendamento detalhado (200) ou `404`.

### PUT `/appointments/{id}`
- Atualiza todas as propriedades (payload igual ao POST). Muda `updated_at` e dispara auditoria.

### PATCH `/appointments/{id}`
- Atualizacao parcial. Ex.: `{ "status": "CONFIRMED", "cancel_reason": "Reagendado" }`.

### DELETE `/appointments/{id}`
- **Objetivo:** cancelar ou remover agendamento.
- **Query param:** `hard=true` para deletar definitivamente. Com `hard=false` (padrao) seta `status=CANCELLED` e `cancel_reason`.
- **Resposta 204.**

---

## Observacoes Gerais
- Campos `*_id` e `*_at` aceitam apenas UUIDs/datas ISO com sufixo `Z`.
- Middleware converte automaticamente camelCase<->snake_case, porem os exemplos acima ja utilizam o formato aceito nos requests.
- Todos os endpoints (exceto `/health` e `POST /auth/login`) exigem `Authorization: Bearer <token>`.
- Em caso de erro as respostas seguem o schema `Error`: `{"error":"validation_error","message":"Erro de validacao","details":[...]}` com o HTTP apropriado (`400`, `401`, `403`, `404` ou `429`).
