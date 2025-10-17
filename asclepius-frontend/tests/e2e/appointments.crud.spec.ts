import { test, expect } from '@playwright/test';
import { uiLogin, selectByTextInsensitive, futureLocalDateTime } from './utils';

const heroPatient = 'Diana Prince';
const heroDoctor = 'Dr. Bruce Banner';

test.describe('Agendamento: POST -> GET -> PUT (status) -> DELETE via UI', () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
    await page.getByRole('link', { name: /agendamentos/i }).click();
    await expect(page.getByRole('heading', { name: /agendamentos/i })).toBeVisible();
  });

  test('fluxo completo', async ({ page }) => {
    // CREATE
    await page.getByRole('button', { name: /novo agendamento/i }).click();

    const selPaciente = page.getByLabel(/^paciente/i);
    const selProf = page.getByLabel(/^profissional/i);
    const selTipo = page.getByLabel(/^tipo/i);
    const inputData = page.getByLabel(/data|agendamento|hor[áa]rio/i);

    // aguarda as listas terem ao menos 2 opções (placeholder + 1 real)
    await selPaciente.locator('option').nth(1).waitFor();
    await selProf.locator('option').nth(1).waitFor();
    await selTipo.locator('option').nth(0).waitFor();

    await selectByTextInsensitive(selPaciente, heroPatient);
    await selectByTextInsensitive(selProf, heroDoctor);
    await inputData.fill(futureLocalDateTime(2));
    await selectByTextInsensitive(selTipo, 'Consulta');

    await page.getByRole('button', { name: /criar|salvar|confirmar/i }).click();

    // READ
    const row = page.locator('tr', { hasText: heroPatient }).first();
    await expect(row).toBeVisible();

    // PUT (status) -> Confirmar
    const btnConfirmar = row.getByRole('button', { name: /confirmar/i }).or(row.getByTitle(/confirmar/i));
    if (await btnConfirmar.count()) {
      await btnConfirmar.first().click();
    }

    // PUT (status) -> Concluir
    const btnConcluir = row.getByRole('button', { name: /concluir/i }).or(row.getByTitle(/concluir/i));
    if (await btnConcluir.count()) {
      await btnConcluir.first().click();
      // se a UI abrir prompt/notes, a API deve aceitar default; senão, ajuste aqui
    }

    // status visual atualizado (em PT-BR)
    await expect(row.getByText(/confirmado|conclu[ií]do/)).toBeVisible({ timeout: 10_000 });

    // DELETE (cancelar/ocultar da grade principal)
    const btnExcluir = row.getByRole('button', { name: /excluir|cancelar|remover/i }).first();
    await btnExcluir.click();
    page.once('dialog', (dialog) => dialog.accept());

    await expect(page.getByText(heroPatient)).toHaveCount(0);
  });
});
