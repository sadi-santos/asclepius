import { test, expect } from '@playwright/test';
import { uiLogin } from './e2e/utils';

test('login e navegação', async ({ page }) => {
  await uiLogin(page);

  // Deve ver a home (Dashboard)
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

  // Navega para Pacientes
  await page.getByRole('link', { name: /pacientes/i }).click();
  await expect(page.getByRole('heading', { name: /pacientes/i })).toBeVisible();

  // Navega para Profissionais
  await page.getByRole('link', { name: /profissionais/i }).click();
  await expect(page.getByRole('heading', { name: /profissionais/i })).toBeVisible();

  // Navega para Agendamentos
  await page.getByRole('link', { name: /agendamentos/i }).click();
  await expect(page.getByRole('heading', { name: /agendamentos/i })).toBeVisible();
});
