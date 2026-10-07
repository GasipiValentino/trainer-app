import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { IconLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";
import { PillLink, PillRow } from "@/components/ui/pills";
import { ProfileHeader, QuickActions } from "@/components/teacher/profile-header";
import { StudentMenu } from "@/components/teacher/student-menu";
import { ReviewBar } from "@/components/teacher/review-bar";
import { SummaryTab } from "@/components/teacher/profile/summary-tab";
import { MetricsTab } from "@/components/teacher/profile/metrics-tab";
import { NotesTab } from "@/components/teacher/profile/notes-tab";
import { PhotosTab } from "@/components/teacher/profile/photos-tab";
import { RoutineTab } from "@/components/teacher/profile/routine-tab";
import { CheckinsTab, WorkoutsTab } from "@/components/teacher/profile/activity-tabs";
import { requireRole } from "@/lib/auth/session";
import { getEnrichedStudents, getStudentProfile, isUuid } from "@/lib/data/students";
import {
  getCheckins,
  getMeasurements,
  getNotes,
  getPhotos,
  getRecentWorkouts,
  getRoutineDetail,
  getTeacherRoutineOptions,
} from "@/lib/data/student-detail";
import { pendingAttention } from "@/lib/domain/alerts";
import { routineWeek } from "@/lib/domain/metrics";
import { attentionScore, ringColor } from "@/lib/domain/presenters";
import { age, LEVEL_LABEL } from "@/lib/format";
import { localDateKey } from "@/lib/dates";
import { routes } from "@/lib/navigation";
import type { ChipTone } from "@/components/ui/chip";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "metricas", label: "Métricas" },
  { id: "fotos", label: "Fotos" },
  { id: "rutina", label: "Rutina" },
  { id: "notas", label: "Notas" },
  { id: "checkins", label: "Check-ins" },
  { id: "historial", label: "Historial" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export async function generateMetadata({ params }: PageProps<"/teacher/students/[id]">) {
  const { id } = await params;
  const s = isUuid(id) ? await getStudentProfile(id) : null;
  return { title: s ? `${s.first_name} ${s.last_name} · Trainer` : "Alumno · Trainer" };
}

/** D3 — Perfil del alumno. */
export default async function StudentProfilePage({ params, searchParams }: PageProps<"/teacher/students/[id]">) {
  await requireRole("teacher");
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();

  const [profile, students] = await Promise.all([getStudentProfile(id), getEnrichedStudents()]);
  const s = students.find((x) => x.id === id);
  // Inexistente o de otro profesor → 404 (RLS no devolvió nada).
  if (!profile || !s) notFound();

  const tab: TabId = TABS.some((t) => t.id === sp.tab) ? (sp.tab as TabId) : "resumen";
  const today = localDateKey();
  const base = routes.teacher.student(id);
  const reviewing = sp.review === "1";

  // Estado de cabecera: la alerta más urgente, o un logro.
  const pending = pendingAttention(s, s.alerts);
  const top = pending[0] ?? s.alerts.find((a) => a.severity === "attention") ?? s.alerts.find((a) => a.severity === "positive");
  const status: { label: string; tone: ChipTone } | undefined = !s.userId
    ? { label: "Invitación pendiente", tone: "flat" }
    : top
      ? { label: top.status, tone: top.severity === "positive" ? "up" : "warn" }
      : undefined;

  const years = age(profile.birth_date);
  const subtitle = [profile.goal, profile.level ? LEVEL_LABEL[profile.level] : null, years != null ? `${years} años` : null]
    .filter(Boolean)
    .join(" · ") || profile.email;

  // Cola de revisión: alumnos con alertas pendientes, en orden de urgencia.
  const queue = students
    .filter((x) => pendingAttention(x, x.alerts).length > 0)
    .sort((a, b) => attentionScore(b) - attentionScore(a));
  const pos = queue.findIndex((x) => x.id === id);
  const next = queue.filter((x) => x.id !== id)[0];

  return (
    <Page className={reviewing ? "pb-48" : ""}>
      <div className="flex justify-between">
        <IconLink href={reviewing ? routes.teacher.home : routes.teacher.students} aria-label="Volver">
          <BackIcon />
        </IconLink>
        <StudentMenu studentId={id} firstName={profile.first_name} pending={!profile.user_id} />
      </div>

      <ProfileHeader firstName={profile.first_name} lastName={profile.last_name} ring={ringColor(s.state)} subtitle={subtitle} status={status} />

      <QuickActions
        actions={[
          {
            label: "Escribir",
            icon: "chat",
            primary: true,
            href: profile.user_id ? routes.teacher.thread(profile.user_id) : undefined,
            disabled: profile.user_id ? undefined : "Disponible cuando active su cuenta",
          },
          { label: "Check-in", icon: "check", href: `${base}?tab=checkins` },
          { label: "Rutina", icon: "list", href: `${base}?tab=rutina` },
          { label: "Medir", icon: "measure", href: `${base}/measure` },
        ]}
      />

      <PillRow>
        {TABS.map((t) => (
          <PillLink key={t.id} href={`${base}?tab=${t.id}${reviewing ? "&review=1" : ""}`} active={tab === t.id}>
            {t.label}
          </PillLink>
        ))}
      </PillRow>

      {tab === "resumen" && (
        <SummaryTab summary={s} measurements={await getMeasurements(id)} workouts={await getRecentWorkouts(id, 5)} />
      )}
      {tab === "metricas" && (
        <MetricsTab studentId={id} measurements={await getMeasurements(id)} measureHref={`${base}/measure`} today={today} />
      )}
      {tab === "fotos" && <PhotosTab studentId={id} photos={await getPhotos(id)} today={today} />}
      {tab === "rutina" && (
        <RoutineTab
          studentId={id}
          active={s.routine}
          detail={s.routine ? await getRoutineDetail(s.routine.id) : null}
          week={routineWeek(s)}
          options={await getTeacherRoutineOptions()}
        />
      )}
      {tab === "notas" && <NotesTab studentId={id} notes={await getNotes(id)} />}
      {tab === "checkins" && <CheckinsTab checkins={await getCheckins(id)} />}
      {tab === "historial" && <WorkoutsTab workouts={await getRecentWorkouts(id, 30)} />}

      {reviewing && (
        <ReviewBar
          studentId={id}
          keys={pending.map((a) => a.key)}
          position={pos >= 0 ? pos + 1 : null}
          total={queue.length}
          nextHref={next ? `${routes.teacher.student(next.id)}?review=1` : routes.teacher.home}
          hasNext={!!next}
        />
      )}
    </Page>
  );
}
