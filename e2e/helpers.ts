import { expect, type Page } from "@playwright/test";

/** Credenciales demo del seed (solo desarrollo). */
export const DEMO = {
  teacher: process.env.E2E_TEACHER_EMAIL ?? "profesor@example.com",
  password: process.env.E2E_PASSWORD ?? "Trainer-demo-2026",
};

/** Sufijo único por corrida: los datos de prueba se reconocen y se limpian. */
export const RUN = Date.now().toString(36);

export async function login(page: Page, email: string, password: string, expectPath: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(expectPath);
}
