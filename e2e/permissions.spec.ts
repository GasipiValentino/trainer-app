import { expect, test, type Page } from "@playwright/test";
import { DEMO, RUN, login } from "./helpers";

/**
 * Permisos desde la app (complementa supabase/tests/rls_permissions.sql):
 * acceso sin sesión, Profesor B contra datos del Profesor A por URL directa,
 * y alumno contra el área del profesor.
 */
test.describe.configure({ mode: "serial" });

const PRIVATE = [
  "/teacher",
  "/teacher/students",
  "/teacher/routines",
  "/teacher/calendar",
  "/teacher/check-ins",
  "/teacher/messages",
  "/student",
  "/student/routine",
  "/student/progress",
  "/student/report",
  "/student/messages",
];

test("sin sesión no se accede a ninguna ruta privada", async ({ page }) => {
  for (const path of PRIVATE) {
    await page.goto(path);
    await expect(page, `${path} debería pedir login`).toHaveURL(/\/login\?next=/);
  }
});

/** IDs reales del Profesor A, leídos desde su propia sesión. */
const A: { student?: string; studentUser?: string; routine?: string } = {};

test("se obtienen recursos del Profesor A", async ({ page }) => {
  await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
  await page.goto("/teacher/students");
  A.student = (await page.getByText("Lucas Ferreyra").locator("xpath=ancestor::a").getAttribute("href"))!.split("/").pop();
  await page.goto("/teacher/routines");
  A.routine = (await page.getByText("Fuerza · Bloque 2").locator("xpath=ancestor::a").getAttribute("href"))!.split("/").pop();
  await page.goto(`/teacher/students/${A.student}`);
  A.studentUser = (await page.getByRole("link", { name: "Escribir" }).getAttribute("href"))!.split("/").pop();
  expect(A.student && A.routine && A.studentUser).toBeTruthy();
});

async function expectNoAccess(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("No encontramos esta página"), path).toBeVisible();
  for (const leak of ["Lucas", "Ferreyra", "Fuerza · Bloque 2", "Tremendo"]) {
    await expect(page.locator("main").getByText(leak, { exact: false }), `${path} filtra "${leak}"`).toHaveCount(0);
  }
}

test("Profesor B no puede ver nada del Profesor A", async ({ page }) => {
  const email = `e2e-profb-${RUN}@example.com`;
  const password = `E2e-${RUN}-profB1`;
  await page.goto("/register");
  await page.getByLabel("Nombre").fill("Profe");
  await page.getByLabel("Apellido").fill("B");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Repetí la contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  // Profesor nuevo: onboarding y lista vacía (no ve alumnos ajenos).
  await expect(page.getByText(/Armemos tu/)).toBeVisible();
  await page.goto("/teacher/students");
  await expect(page.getByText("No tenés alumnos todavía")).toBeVisible();
  await page.goto("/teacher/routines");
  await expect(page.getByText("Todavía no creaste rutinas")).toBeVisible();

  for (const path of [
    `/teacher/students/${A.student}`,
    `/teacher/students/${A.student}?tab=notas`,
    `/teacher/students/${A.student}/progress`,
    `/teacher/students/${A.student}/report`,
    `/teacher/students/${A.student}/edit`,
    `/teacher/students/${A.student}/measure`,
    `/teacher/routines/${A.routine}`,
    `/teacher/messages/${A.studentUser}`,
  ]) {
    await expectNoAccess(page, path);
  }

  // Limpieza: B elimina su propia cuenta desde la app.
  await page.goto("/teacher/account");
  await page.getByLabel('Escribí "ELIMINAR" para confirmar').fill("ELIMINAR");
  await page.getByRole("button", { name: "Eliminar mi cuenta definitivamente" }).click();
  await expect(page).toHaveURL(/\/login\?deleted=1/);
});

test("el alumno no entra al área del profesor ni a perfiles ajenos", async ({ page }) => {
  await login(page, "lucas.ferreyra@example.com", DEMO.password, /\/student$/);
  for (const path of ["/teacher", "/teacher/students", `/teacher/students/${A.student}`, `/teacher/routines/${A.routine}`, "/teacher/check-ins"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/student$/);
  }
});
