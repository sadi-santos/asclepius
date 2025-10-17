import { test, expect } from '@playwright/test';
import { uiLogin } from './utils';

const pro = {
  nome: 'Dr. Stephen Strange',
  funcao: 'Médico',
  especialidade: 'Cirurgia',
  crm: 'CRM-SP 123456',
  email: 'stephen.strange@kamar-taj.org',
  fone: '(11) 98888-7777',
};

test.describe('Profissional: POST -> GET -> PUT -> DELETE via UI', () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
    await page.getByRole('link', { name: /profissionais/i }).click();
  });

  test('fluxo completo', async ({ page }) => {
    // CREATE
    await page.getByRole('button', { name: /novo profissional/i }).click();

    await page.getByLabel(/nome completo/i).fill(pro.nome);
    await page.getByLabel(/^funç(ão|ao)$/i).fill(pro.funcao);
    await page.getByLabel(/especialidade/i).fill(pro.especialidade);
    await page.getByLabel(/licen[cs]a|crm/i).fill(pro.crm);
    await page.getByLabel(/^email$/i).fill(pro.email);
    await page.getByLabel(/telefone/i).fill(pro.fone);

    await page.getByRole('button', { name: /salvar|criar|confirmar/i }).click();

    await expect(page.getByText(pro.nome)).toBeVisible();

    // UPDATE
    await page.locator('tr', { hasText: pro.nome }).getByRole('button', { name: /editar/i }).click();
    await page.getByLabel(/especialidade/i).fill('Neurocirurgia');
    await page.getByRole('button', { name: /salvar|atualizar|confirmar/i }).click();

    await expect(page.getByText('Neurocirurgia')).toBeVisible();

    // DELETE
    const row = page.locator('tr', { hasText: pro.nome });
    await row.getByRole('button', { name: /excluir|apagar|remover/i }).click();
    page.once('dialog', (dialog) => dialog.accept());

    await expect(page.getByText(pro.nome)).toHaveCount(0);
  });
});
