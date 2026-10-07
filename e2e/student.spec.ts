import { expect, test } from "@playwright/test";
import { DEMO, RUN, login } from "./helpers";

/**
 * Recorrido del alumno (Etapa 5) con Lucas, del seed demo. Lo que crea
 * (entreno de hoy, check-in de esta semana, mensaje) se limpia con
 * supabase/tests/cleanup_e2e.sql.
 */
test.describe.configure({ mode: "serial" });

const LUCAS = process.env.E2E_STUDENT_EMAIL ?? "lucas.ferreyra@example.com";

test("inicio del alumno con datos reales", async ({ page }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  await expect(page.getByText("Hola, Lucas")).toBeVisible();
  await expect(page.getByText("Esta semana")).toBeVisible();
  await expect(page.getByText("Próximos entrenamientos")).toBeVisible();
  await expect(page.getByRole("button", { name: /Empezar entrenamiento|Continuar entrenamiento/ }).or(page.getByRole("link", { name: /Continuar entrenamiento|Ver mi plan/ }))).toBeVisible();
});

test("entrenar: marcar series, RPE y terminar", async ({ page }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  // Desde Mi plan siempre se puede empezar (o retomar), aunque ya haya entrenado hoy.
  await page.goto("/student/routine");
  const start = page.getByRole("button", { name: /^Empezar / });
  const resume = page.getByRole("link", { name: "Continuar entrenamiento" });
  await expect(start.or(resume)).toBeVisible();
  if (await start.isVisible()) await start.click();
  else await resume.click();
  await expect(page).toHaveURL(/\/student\/workout\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/ejercicio 1 de \d+/)).toBeVisible();

  await page.getByLabel("Repeticiones serie 1").fill("6");
  await page.getByRole("button", { name: "Marcar serie 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desmarcar serie 1", exact: true })).toBeVisible();
  await expect(page.getByText("Descanso")).toBeVisible();
  await page.getByRole("button", { name: "Marcar serie 2", exact: true }).click();
  const rpe8 = page.getByRole("button", { name: "8", exact: true });
  await rpe8.click(); // RPE
  await expect(rpe8).toHaveAttribute("aria-pressed", "true");
  await expect(rpe8).toBeEnabled(); // terminó de guardarse

  // Retomar: al recargar, las series marcadas y el RPE siguen ahí.
  await page.reload();
  await expect(page.getByRole("button", { name: "Desmarcar serie 2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "8", exact: true })).toHaveAttribute("aria-pressed", "true");

  // Ir al último ejercicio y terminar.
  while (await page.getByRole("button", { name: /^Siguiente:/ }).isVisible()) {
    await page.getByRole("button", { name: /^Siguiente:/ }).click();
  }
  await page.getByRole("button", { name: "Terminar entrenamiento" }).click();
  const sheet = page.getByRole("dialog", { name: "Terminar entrenamiento" });
  await sheet.getByRole("textbox").fill(`Nota E2E ${RUN}`);
  await sheet.getByRole("button", { name: "Finalizar y guardar" }).click();
  await expect(page).toHaveURL(/\/student\?done=1/);
  await expect(page.getByText("¡Entrenamiento guardado!")).toBeVisible();
});

test("el profesor ve el entrenamiento en el historial", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/students");
  await page.getByText("Lucas Ferreyra").click();
  await page.getByRole("link", { name: "Historial" }).click();
  await expect(page.getByText(`“Nota E2E ${RUN}”`)).toBeVisible();
});

test("check-in semanal", async ({ page }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  await page.goto("/student/check-in");
  const send = page.getByRole("button", { name: /Faltan 5 respuestas|Enviar a/ });
  await expect(send).toBeVisible();
  for (const [q, v] of [["Energía", 4], ["Sueño", 3], ["Estrés", 2], ["Dolor", 1], ["Motivación", 5]] as const) {
    await page.getByRole("radio", { name: `${q} ${v}` }).click();
  }
  await page.getByRole("button", { name: "Uno más" }).click();
  await page.getByRole("textbox").fill(`Check-in E2E ${RUN}`);
  await page.getByRole("button", { name: "Enviar a Marcos" }).click();
  await expect(page).toHaveURL(/\/student\?checkin=1/);
});

test("progreso, plan, agenda y coach", async ({ page }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  await page.goto("/student/progress");
  await expect(page.getByRole("heading", { name: "Mi progreso" })).toBeVisible();
  await expect(page.getByText("Medidas")).toBeVisible();
  await expect(page.getByText("Logros")).toBeVisible();

  await page.goto("/student/routine");
  await expect(page.getByText("Fuerza · Bloque 2")).toBeVisible();

  await page.goto("/student/calendar");
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

  await page.goto("/student/messages");
  await expect(page.getByText("Tu coach")).toBeVisible();
  await page.getByLabel("Mensaje").fill(`Mensaje alumno E2E ${RUN}`);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(`Mensaje alumno E2E ${RUN}`)).toBeVisible();
});

test("el alumno no accede a datos ajenos", async ({ page }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  // Entreno inexistente / ajeno → 404, sin datos.
  await page.goto("/student/workout/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
  // Área del profesor → redirige a la propia.
  await page.goto("/teacher/students");
  await expect(page).toHaveURL(/\/student$/);
});

test("reporte: el alumno no ve notas privadas; el profesor sí", async ({ page, browser }) => {
  await login(page, LUCAS, DEMO.password, /\/student$/);
  await page.goto("/student/progress");
  await page.getByRole("link", { name: "Ver reporte" }).click();
  await expect(page.getByText("Reporte de progreso")).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeVisible();
  await expect(page.getByText("Notas del coach")).toHaveCount(0);

  const ctx = await browser.newContext();
  const t = await ctx.newPage();
  await login(t, DEMO.teacher, DEMO.password, /\/teacher$/);
  await t.goto("/teacher/students");
  await t.getByText("Lucas Ferreyra").click();
  await t.getByRole("button", { name: "Más opciones" }).click();
  await t.getByRole("button", { name: /Reporte de progreso/ }).click();
  await expect(t.getByText("Notas del coach (privadas)")).toBeVisible();
  await ctx.close();
});
