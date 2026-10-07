import { expect, test } from "@playwright/test";
import { DEMO, RUN, login } from "./helpers";

/**
 * Recorrido del profesor (Etapa 4): alta de alumno + invitación + activación,
 * medición, nota, rutina asignada, agenda y mensajes. Todo contra la base real.
 * Los datos creados llevan el sufijo RUN (e2e-…) para limpiarlos después.
 */
test.describe.configure({ mode: "serial" });

const student = {
  first: "Prueba",
  last: `E2E ${RUN}`,
  email: `e2e-${RUN}@example.com`,
  password: `E2e-${RUN}-pass1`,
};
let inviteUrl = "";
let studentPath = "";

test("dashboard muestra datos reales", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await expect(page.getByText("Atención hoy")).toBeVisible();
  await expect(page.getByText("Entrenos semana")).toBeVisible();
  await expect(page.getByText("Novedades")).toBeVisible();
});

test("agregar alumno genera invitación", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/students/new");
  await page.getByLabel("Nombre", { exact: true }).fill(student.first);
  await page.getByLabel("Apellido").fill(student.last);
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Objetivo").fill("Fuerza");
  await page.getByLabel("Peso inicial (kg)").fill("80,5");
  await page.getByRole("button", { name: "Crear e invitar" }).click();
  await expect(page.getByRole("button", { name: "Enviar invitación" })).toBeVisible();
  inviteUrl = (await page.locator("span.truncate", { hasText: "/invite/" }).textContent())!.trim();
  expect(inviteUrl).toMatch(/\/invite\/[a-f0-9]{64}$/);

  // Aparece en la lista como invitado.
  await page.goto("/teacher/students");
  await expect(page.getByText(`${student.first} ${student.last}`)).toBeVisible();
});

test("validación: email duplicado y peso inválido", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/students/new");
  await page.getByLabel("Nombre", { exact: true }).fill("Dup");
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Peso inicial (kg)").fill("-3");
  await page.getByRole("button", { name: "Crear e invitar" }).click();
  await expect(page.getByText("Peso: tiene que estar entre 20 y 400.")).toBeVisible();
  await page.getByLabel("Peso inicial (kg)").fill("");
  await page.getByRole("button", { name: "Crear e invitar" }).click();
  await expect(page.getByText("Ya tenés un alumno con ese email.")).toBeVisible();
});

test("el alumno activa su cuenta con la invitación", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(new URL(inviteUrl).pathname);
  await expect(page.getByText(`Hola, ${student.first}`)).toBeVisible();
  await page.getByLabel("Creá tu contraseña").fill(student.password);
  await page.getByLabel("Repetí la contraseña").fill(student.password);
  await page.getByRole("button", { name: "Activar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/student$/);
  // Un alumno no entra al área del profesor.
  await page.goto("/teacher/students");
  await expect(page).toHaveURL(/\/student/);
  await ctx.close();
});

test("medir, anotar y ver el perfil", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/students");
  await page.getByText(`${student.first} ${student.last}`).click();
  await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f-]{36}$/);
  studentPath = new URL(page.url()).pathname;

  await page.getByRole("link", { name: "Medir" }).click();
  await page.getByLabel("Peso (kg)").fill("79,9");
  await page.getByLabel("Cintura (cm)").fill("84");
  await page.getByRole("button", { name: "Guardar medición" }).click();
  await expect(page).toHaveURL(/tab=metricas/);
  await expect(page.getByText(/Peso 79,9 kg · Cintura 84 cm/)).toBeVisible();

  await page.goto(`${studentPath}?tab=notas`);
  await page.getByLabel("Nueva nota (solo la ves vos)").fill(`Nota E2E ${RUN}`);
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText(`Nota E2E ${RUN}`)).toBeVisible();
});

test("crear rutina, agregar ejercicio y asignarla", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/routines/new");
  await page.getByLabel("Nombre de la rutina").fill(`E2E Rutina ${RUN}`);
  await page.getByRole("button", { name: "+ Ejercicio" }).click();
  await page.getByLabel("Buscar ejercicio").fill("sentadilla trasera");
  await page.getByRole("button", { name: "Elegir Sentadilla trasera" }).click();
  await page.getByRole("button", { name: "Agregar 1 ejercicio" }).click();
  await expect(page.getByText("1. Sentadilla trasera")).toBeVisible();

  await page.getByRole("button", { name: "Guardar y asignar" }).click();
  await expect(page).toHaveURL(/\/teacher\/routines\/[0-9a-f-]{36}\?assign=1/);
  const sheet = page.getByRole("dialog", { name: "Asignar rutina" });
  await sheet.getByRole("button", { name: new RegExp(`${student.first} ${student.last}`) }).click();
  await sheet.getByRole("button", { name: "Asignar a 1" }).click();
  await expect(sheet.getByText("Rutina asignada.")).toBeVisible();

  await page.goto(`${studentPath}?tab=rutina`);
  await expect(page.getByText(`E2E Rutina ${RUN}`)).toBeVisible();
});

test("agendar un evento", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/calendar/new?date=2026-10-08");
  await page.getByRole("button", { name: "Evaluación" }).click();
  await page.getByLabel("Alumno (opcional)").selectOption({ label: `${student.first} ${student.last}` });
  await page.getByLabel("Título").fill(`E2E evaluación ${RUN}`);
  await page.getByLabel("Hora").fill("10:30");
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/teacher\/calendar\?date=2026-10-08/);
  await expect(page.getByText(`E2E evaluación ${RUN}`)).toBeVisible();
});

test("mensaje al alumno", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto(studentPath);
  await page.getByRole("link", { name: "Escribir" }).click();
  await expect(page).toHaveURL(/\/teacher\/messages\/[0-9a-f-]{36}$/);
  await page.getByLabel("Mensaje").fill(`Hola desde E2E ${RUN}`);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(`Hola desde E2E ${RUN}`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Hola desde E2E ${RUN}`)).toBeVisible();
});
