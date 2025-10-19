# README – Execução do teste automatizado visual

Este guia descreve como rodar o teste ponta a ponta que demonstra toda a jornada do usuário admin no Asclepius (login → cadastro de paciente → cadastro de profissional → agendamento), exibindo cada interação diretamente no navegador.

---

## 1. Arquivo do teste

- **Diretório:** `asclepius-frontend/tests/e2e/`
- **Arquivo:** `admin-visual-journey.e2e.spec.ts`

O teste foi criado com Playwright.

---

## 2. Pré-requisitos

1. **Node.js 20+** e **PNPM 9+** instalados e disponíveis no PATH.
2. Dependências do frontend instaladas:
   ```powershell
   cd c:\Projetos\asclepius\asclepius-frontend
   pnpm install
   ```
3. Navegadores do Playwright instalados (uma única vez):
   ```powershell
   pnpm exec playwright install
   ```
4. Backend e frontend do Asclepius em execução (para que o teste encontre a API e a SPA). Exemplo rápido:
   ```powershell
   # Terminal 1
   pnpm --filter asclepius-backend dev

   # Terminal 2
   pnpm --filter asclepius-frontend dev
   ```

---

## 3. Execução interativa (headful)

### Opção A – a partir do diretório do frontend

```powershell
cd c:\Projetos\asclepius\asclepius-frontend
pnpm exec playwright test tests/e2e/admin-visual-journey.e2e.spec.ts --project=chromium --headed --workers=1
```

### Opção B – a partir da raiz do monorepo

```powershell
cd c:\Projetos\asclepius
pnpm --filter ./asclepius-frontend exec playwright test tests/e2e/admin-visual-journey.e2e.spec.ts --project=chromium --headed --workers=1
```

Ambos os comandos:

- Abrem o Chrome controlado pelo Playwright (`--headed`).
- Executam o fluxo completo com animação lenta (`slowMo`) configurada dentro do próprio arquivo de teste.
- Usam um único worker para manter a sequência visual (`--workers=1`).

---

## 4. Relatórios e replays (opcionais)

- Reabrir o último relatório HTML:
  ```powershell
  pnpm exec playwright show-report
  ```
- Repetir a execução com a UI do Playwright Test Runner:
  ```powershell
  pnpm exec playwright test --ui
  ```

---

## Plano de Testes (casos, resultados, evidências)

1. **Login do admin**
   - Ação: acessar `/login`, preencher credenciais padrão e enviar.
   - Evidência esperada: redirecionamento para o Dashboard com o heading `Dashboard`.
2. **Cadastro de paciente (personagem HQ)**
   - Ação: navegar até `Pacientes → Novo`, preencher todos os campos obrigatórios (nome, CPF válido, data de nascimento, contato) e salvar.
   - Evidência esperada: retorno à listagem com o paciente recém-criado visível na tabela.
3. **Cadastro de profissional (personagem HQ)**
   - Ação: navegar até `Profissionais → Novo`, definir função `Médico(a)`, selecionar especialidade, informar CRM e salvar.
   - Evidência esperada: profissional aparecendo na lista com status `Ativo`.
4. **Agendamento com os registros criados**
   - Ação: acessar `Agendamentos → Novo`, selecionar o paciente e o profissional criados, escolher data/hora futura, tipo `Consulta`, status `Confirmado` e informar motivo.
   - Evidência esperada: linha na listagem de agendamentos contendo paciente, profissional e status `Confirmado`.

### Registro de resultados e screenshots

- **Relatório HTML:** cada execução gera `playwright-report/index.html`. Abra com `pnpm exec playwright show-report` para capturar evidências (prints, timeline, vídeo).
- **Artefatos brutos:** o diretório `asclepius-frontend/test-results/` guarda vídeos (`video.webm`), screenshots e registros adicionais quando configurados (falhas ou `--trace on`).
- **Exportação rápida:** após validar a execução, baixe as evidências desejadas diretamente do Playwright Report para anexar ao material de entrega.

---

## 5. Observações

- O teste pressupõe que as credenciais padrão (`admin@vidaplus.com` / `VidaPlus@2025`) estejam válidas.
- Cada execução gera CPFs e e-mails únicos, evitando conflitos com registros anteriores.
- Ajuste o `slowMo` em `admin-visual-journey.e2e.spec.ts` se quiser acelerar ou desacelerar a reprodução visual.
