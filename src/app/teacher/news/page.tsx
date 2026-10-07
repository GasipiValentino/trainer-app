import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { FeedList, type FeedItem } from "@/components/teacher/dashboard";
import { requireRole } from "@/lib/auth/session";
import { getEnrichedStudents } from "@/lib/data/students";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Novedades · Trainer" };

/** "Ver todo" de Novedades: todas las alertas vigentes, agrupadas por tipo. */
export default async function NewsPage() {
  await requireRole("teacher");
  const students = await getEnrichedStudents();
  const all: FeedItem[] = students.flatMap((s) =>
    s.alerts.map((a) => ({ ...a, firstName: s.firstName, lastName: s.lastName })),
  );
  const pick = (sev: FeedItem["severity"], reviewed: boolean) =>
    all
      .filter((a) => a.severity === sev && students.find((s) => s.id === a.studentId)!.reviewed.includes(a.key) === reviewed)
      .sort((a, b) => b.weight - a.weight);

  const attention = pick("attention", false);
  const positive = pick("positive", false);
  const info = pick("info", false);
  const reviewed = pick("attention", true);

  return (
    <Page narrow>
      <SubHeader backHref={routes.teacher.home} eyebrow="Hoy" title="Novedades" />
      <FeedList title={`Para revisar · ${attention.length}`} items={attention} />
      {positive.length > 0 && <FeedList title="Logros" items={positive} />}
      {info.length > 0 && <FeedList title="Para tener en cuenta" items={info} />}
      {reviewed.length > 0 && <FeedList title="Ya revisadas" items={reviewed} />}
    </Page>
  );
}
