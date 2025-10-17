import { Page, expect, Locator } from '@playwright/test';

/** Login via UI usando baseURL configurada */
export async function uiLogin(page: Page) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill('admin@vidaplus.com');
  await page.getByTestId('password-input').fill('VidaPlus@2025');
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/$/);
}

/** Seleciona <select> por texto do rótulo (case-insensitive) */
export async function selectByTextInsensitive(select: Locator, labelText: string) {
  const target = labelText.trim().toLowerCase();
  const options = await select.locator('option').all();

  for (const opt of options) {
    const label = await opt.evaluate((el: HTMLOptionElement) => el.label || el.textContent || '');
    if ((label || '').trim().toLowerCase() === target) {
      const value = (await opt.getAttribute('value')) ?? '';
      if (!value) throw new Error(`Option label found but value empty: "${labelText}"`);
      await select.selectOption(value);
      return;
    }
  }
  throw new Error(`Option not found by label (ci): "${labelText}"`);
}

/** Retorna string YYYY-MM-DDTHH:mm para <input type="datetime-local"> no futuro */
export function futureLocalDateTime(minutesAhead: number = 60): string {
  const d = new Date(Date.now() + minutesAhead * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
