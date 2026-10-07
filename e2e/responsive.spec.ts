import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers";

/**
 * Responsive: ninguna pantalla desborda horizontalmente en mobile (375),
 * tablet (768) ni desktop (1280).
 */
const WIDTHS = [375, 768, 1280];

const TEACHER_PAGES = [
  "/teacher",
  "/teacher/students",
  "/teacher/students/new",
  "/teacher/routines",
  "/teacher/routines/new",
  "/teacher/calendar",
  "/teacher/calendar?view=mes",
  "/teacher/check-ins",
  "/teacher/messages",
  "/teacher/news",
  "/teacher/account",
];
const STUDENT_PAGES = [
  "/student",
  "/student/routine",
  "/student/progress",
  "/student/progress/measurements",
  "/student/report",
  "/student/check-in",
  "/student/calendar",
  "/student/messages",
  "/student/account",
];

async function overflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const width of WIDTHS) {
  test(`profesor sin desborde a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, DEMO.teacher, DEMO.password, /\/teacher$/);
    // Incluye el perfil y el progreso de un alumno con datos.
    await page.goto("/teacher/students");
    const href = await page.getByText("Lucas Ferreyra").locator("xpath=ancestor::a").getAttribute("href");
    const pages = [...TEACHER_PAGES, href!, `${href}?tab=historial`, `${href}/progress`, `${href}/report`];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await overflow(page), `${path} @${width}`).toBeLessThanOrEqual(1);
    }
  });

  test(`alumno sin desborde a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, "lucas.ferreyra@example.com", DEMO.password, /\/student$/);
    for (const path of STUDENT_PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await overflow(page), `${path} @${width}`).toBeLessThanOrEqual(1);
    }
  });
}

test("pantallas de acceso sin desborde", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/login", "/register", "/forgot-password", "/invite/" + "0".repeat(64)]) {
      await page.goto(path);
      expect(await overflow(page), `${path} @${width}`).toBeLessThanOrEqual(1);
    }
  }
});
