import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const AUTH_EMAIL = process.env.E2E_AUTH_EMAIL ?? "admin@vidaplus.com";
const AUTH_PASSWORD = process.env.E2E_AUTH_PASSWORD ?? "VidaPlus@2025";
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:3001";

let cachedAuth: { token: string; userJson: string } | null = null;
let initScriptAdded = false;

const authenticateViaApi = async (page: Page) => {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    throw new Error("Defina E2E_AUTH_EMAIL e E2E_AUTH_PASSWORD para executar os testes E2E.");
  }

  const response = await page.context().request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: AUTH_EMAIL, password: AUTH_PASSWORD },
  });

  if (!response.ok()) {
    throw new Error(`Falha ao autenticar no backend: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  const token = String(body?.token ?? "");
  if (!token) throw new Error("Resposta do login sem token");
  const userJson =
    process.env.E2E_AUTH_USER ?? JSON.stringify(body?.user ?? { id: "unknown", email: AUTH_EMAIL, role: "ADMIN" });

  cachedAuth = { token, userJson };
};

const ensureAuthenticated = async (page: Page) => {
  if (!cachedAuth) {
    await authenticateViaApi(page);
  }

  if (!cachedAuth) throw new Error("Não foi possível obter token de autenticação");

  if (!initScriptAdded) {
    await page.context().addInitScript(({ token, user }) => {
      window.localStorage.setItem("token", token);
      if (user) window.localStorage.setItem("user", user);
    }, { token: cachedAuth.token, user: cachedAuth.userJson });
    initScriptAdded = true;
  }

  await page.goto("/patients");

  await page.evaluate(({ token, user }) => {
    window.localStorage.setItem("token", token);
    if (user) window.localStorage.setItem("user", user);
  }, { token: cachedAuth.token, user: cachedAuth.userJson });

  await page.goto("/patients");
  await expect(page).toHaveURL(/\/patients$/);
};

const generateCPF = () => {
  const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += numbers[i] * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;

  numbers.push(firstDigit);

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += numbers[i] * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;

  numbers.push(secondDigit);
  return numbers.join("");
};

const ensurePatientExists = async (page: Page) => {
  if (!page.url().includes("/patients")) {
    await page.goto("/patients");
  }
  const rows = page.locator("table tbody tr");
  if ((await rows.count()) > 0) return;

  await page.getByRole("link", { name: /novo/i }).click();
  await expect(page).toHaveURL(/\/patients\/new$/);

  const patientName = `Paciente Teste ${Date.now()}`;
  const cpf = generateCPF();

  await page.getByLabel(/Nome completo \*/i).fill(patientName);
  await page.getByLabel(/CPF \*/i).fill(cpf);
  await page.getByLabel(/Data de nascimento \*/i).fill("1990-01-01");

  await page.getByRole("button", { name: /criar/i }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await expect(rows.first()).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test("Salvar edição sem tocar no CPF não deve acusar CPF inválido", async ({ page }) => {
  await ensurePatientExists(page);

  const firstRow = page.locator("table tbody tr").first();
  await firstRow.locator("td").first().locator("button, a").first().click();

  const nameField = page.getByLabel(/Nome completo \*/i);
  await expect(nameField).toBeVisible();
  const currentName = await nameField.inputValue();
  await nameField.fill(`${currentName || "Paciente"} Atualizado`);

  await page.getByRole("button", { name: /salvar|criar/i }).click();

  await expect(page.locator("text=CPF inválido")).toHaveCount(0);
  await expect(page).toHaveURL(/\/patients$/);
});

test("Detalhe deve retornar CPF com 11 dígitos (via interceptação)", async ({ page }) => {
  await ensurePatientExists(page);

  const firstRow = page.locator("table tbody tr").first();

  const [detailResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === "GET" && /\/patients\/[\w-]+$/.test(response.url())
    ),
    firstRow.locator("td").first().locator("button, a").first().click(),
  ]);

  const patientDetail = await detailResponse.json();
  const cpfDigits = String(patientDetail?.cpf ?? "").replace(/\D+/g, "");
  expect(cpfDigits.length).toBe(11);
});
