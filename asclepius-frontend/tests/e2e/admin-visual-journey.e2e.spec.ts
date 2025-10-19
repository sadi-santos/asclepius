import { test, expect, Page, Locator } from '@playwright/test';
import { uiLogin, futureLocalDateTime } from './utils';

type LabelText = string | RegExp;

function generateCpf(): string {
  const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  const calcDigit = (digits: number[], factorStart: number) => {
    const total = digits.reduce((acc, digit, index) => acc + digit * (factorStart - index), 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(randomDigits, 10);
  const withFirst = [...randomDigits, firstDigit];
  const secondDigit = calcDigit(withFirst, 11);
  return [...withFirst, secondDigit].join('');
}

async function controlForLabel(page: Page, labelText: LabelText): Promise<Locator> {
  const label = page.locator('label').filter({ hasText: labelText }).first();
  await expect(label, `Label ${labelText} should be visible`).toBeVisible();

  const forAttr = await label.getAttribute('for');
  if (forAttr) {
    return page.locator(`#${forAttr}`);
  }

  const container = label.locator('xpath=..');
  const control = container.locator('input, textarea, select').first();
  await expect(control, `Control for label ${labelText} should exist`).toBeVisible();
  return control;
}

async function fillField(page: Page, labelText: LabelText, value: string) {
  const control = await controlForLabel(page, labelText);
  await control.fill(value);
}

async function selectOptionByLabel(page: Page, labelText: LabelText, option: { value?: string; label?: string }) {
  const control = await controlForLabel(page, labelText);
  await control.selectOption(option);
}

async function setCheckbox(page: Page, labelText: LabelText, checked: boolean) {
  const control = await controlForLabel(page, labelText);
  await control.setChecked(checked);
}

test.use({
  headless: false,
  viewport: { width: 1366, height: 768 },
  launchOptions: { slowMo: 200 },
});

test.describe('Jornada visual do admin', () => {
  test('login, cadastros completos e agendamento visíveis em tela', async ({ page }) => {
    test.setTimeout(120_000);
    await uiLogin(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const unique = Date.now().toString().slice(-6);
    const patient = {
      fullName: `Diana Prince ${unique}`,
      cpf: generateCpf(),
      birthDate: '1985-06-04',
      email: `diana.prince${unique}@justice.test`,
      phone: '(11) 95555-1234',
      address: 'Themyscira, Paradise Island',
      bloodType: 'O+',
    };
    const professional = {
      fullName: `Stephen Strange ${unique}`,
      email: `stephen.strange${unique}@marvel.test`,
      phone: '(11) 94444-2222',
      license: `CRM-${unique}`,
      specialty: 'Neurologia',
    };
    const appointment = {
      reason: 'Consulta multidimensional de acompanhamento.',
      schedule: futureLocalDateTime(120),
    };

    const pause = async (ms = 600) => page.waitForTimeout(ms);

    await page.getByRole('link', { name: 'Pacientes' }).click();
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await pause();

    await page.locator('a[title="Novo paciente"]').click();
    await expect(page.getByRole('heading', { name: 'Novo Paciente' })).toBeVisible();

    await fillField(page, /Nome completo/, patient.fullName);
    await fillField(page, /CPF/, patient.cpf);
    await page.locator('#birthDate').fill(patient.birthDate);
    await fillField(page, /E-mail/, patient.email);
    await fillField(page, /Telefone/, patient.phone);
    await fillField(page, /Endere/, patient.address);
    await fillField(page, /Tipo Sang/, patient.bloodType);
    await setCheckbox(page, /Cadastro ativo/, true);
    await pause();

    await page.getByRole('button', { name: /Criar/ }).click();
    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByRole('button', { name: patient.fullName })).toBeVisible();

    await page.getByRole('link', { name: 'Profissionais' }).click();
    await expect(page.getByRole('heading', { name: 'Profissionais' })).toBeVisible();
    await pause();

    await page.getByRole('button', { name: 'Novo Profissional' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Profissional' })).toBeVisible();

    await fillField(page, /Nome completo/, professional.fullName);
    await selectOptionByLabel(page, /Fun/, { value: 'DOCTOR' });
    await selectOptionByLabel(page, /Especialidade/, { label: professional.specialty });
    await fillField(page, /Registro/, professional.license);
    await fillField(page, /E-mail/, professional.email);
    await fillField(page, /Telefone/, professional.phone);
    await setCheckbox(page, /Cadastro ativo/, true);
    await pause();

    await page.getByRole('button', { name: /Criar/ }).click();
    await expect(page).toHaveURL(/\/professionals$/);
    await expect(page.getByText(professional.fullName, { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Agendamentos' }).click();
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
    await pause();

    await page.getByRole('button', { name: 'Novo Agendamento' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Agendamento' })).toBeVisible();

    await selectOptionByLabel(page, /Paciente/, { label: patient.fullName });
    await selectOptionByLabel(page, /Profissional/, { label: professional.fullName });
    await fillField(page, /Data\/Hora/, appointment.schedule);
    await selectOptionByLabel(page, /Tipo/, { value: 'CONSULTATION' });
    await selectOptionByLabel(page, /Status/, { value: 'CONFIRMED' });
    await fillField(page, /Motivo/, appointment.reason);
    await pause();

    await page.getByRole('button', { name: /Criar agendamento/ }).click();
    await expect(page).toHaveURL(/\/appointments$/);

    const appointmentRow = page
      .locator('tr')
      .filter({ has: page.getByRole('cell', { name: patient.fullName }) })
      .filter({ has: page.getByRole('cell', { name: professional.fullName }) });

    await expect(appointmentRow).toBeVisible();
    await expect(appointmentRow.getByRole('cell', { name: /Confirmado/ })).toBeVisible();
    await pause(1200);
  });
});
