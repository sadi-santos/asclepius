import { test, expect } from '@playwright/test';

test('Salvar edição sem tocar no CPF não deve acusar CPF inválido', async ({ page }) => {
  // Se a app exige login via token no localStorage, você pode injetar aqui
  // await page.addInitScript(() => localStorage.setItem('token', '<SEU_TOKEN>'));

  await page.goto('/patients');
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor();
  await firstRow.locator('td').first().locator('button, a').first().click();

  const nome = page.getByLabel(/Nome completo \*/i);
  await expect(nome).toBeVisible();
  const antigo = await nome.inputValue();
  await nome.fill((antigo || 'Paciente') + ' Teste');

  const salvar = page.getByRole('button', { name: /salvar|criar/i });
  await salvar.click();

  await expect(page.locator('text=CPF inválido')).toHaveCount(0);
  await expect(page).toHaveURL(/\/patients$/);
});

test('Detalhe deve retornar CPF com 11 dígitos (via interceptação)', async ({ page }) => {
  let gotDetail: any;
  page.on('response', async (resp) => {
    if (resp.request().method() === 'GET' && /\/patients\/[^/?]+$/.test(resp.url())) {
      try { gotDetail = await resp.json(); } catch {}
    }
  });

  await page.goto('/patients');
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor();
  await firstRow.locator('td').first().locator('button, a').first().click();

  expect(gotDetail).toBeTruthy();
  const cpf = String(gotDetail?.cpf ?? '').replace(/\D+/g, '');
  expect(cpf.length).toBe(11);
});
