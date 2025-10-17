import { test, expect } from '@playwright/test';
import { uiLogin } from './utils';

const hero = {
  nome: 'Clark Kent',
  cpf: '123.456.789-09',
  nascimento: '1978-06-18',
  email: 'clark.kent@dailyplanet.com',
  fone: '(11) 95555-1234',
};

test.describe('Paciente: POST -> GET -> PUT -> DELETE via UI', () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
    await page.getByRole('link', { name: /pacientes/i }).click();
  });

  test('fluxo completo', async ({ page }) => {
    // CREATE
    await page.getByRole('button', { name: /novo paciente/i }).click();

    await page.getByLabel(/nome completo/i).fill(hero.nome);
    await page.getByLabel(/^cpf/i).fill(hero.cpf);
    await page.getByLabel(/data de nascimento/i).fill(hero.nascimento);
    await page.getByLabel(/^email$/i).fill(hero.email);
    await page.getByLabel(/telefone/i).fill(hero.fone);

    await page.getByRole('button', { name: /salvar|criar|confirmar/i }).click();

    // READ (listagem contém)
    await expect(page.getByText(hero.nome)).toBeVisible();

    // UPDATE (editar primeiro item com o nome)
    await page.locator('tr', { hasText: hero.nome }).getByRole('link', { name: /editar/i }).click();
    await page.getByLabel(/nome completo/i).fill(hero.nome + ' Jr.');
    await page.getByRole('button', { name: /salvar|atualizar|confirmar/i }).click();

    await expect(page.getByText(hero.nome + ' Jr.')).toBeVisible();

    // DELETE
    const row = page.locator('tr', { hasText: hero.nome + ' Jr.' });
    await row.getByRole('button', { name: /excluir|apagar|remover/i }).click();

    // confirma dialog nativo se houver
    page.once('dialog', (dialog) => dialog.accept());

    // some da listagem
    await expect(page.getByText(hero.nome + ' Jr.')).toHaveCount(0);
  });
});
