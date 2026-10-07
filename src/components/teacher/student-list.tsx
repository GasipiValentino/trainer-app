"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { FilterIcon, SearchIcon } from "@/components/ui/icons";
import { PillButton, PillRow } from "@/components/ui/pills";
import { Sheet, SheetOption } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { routes } from "@/lib/navigation";
import type { StudentState } from "@/lib/domain/alerts";

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  goal: string;
  ring: string;
  state: StudentState;
  lastLabel: string;
  lastColor: string;
  cells: boolean[];
  chip: { label: string; tone: ChipTone };
  score: number;
  lastWorkoutAt: string | null;
  needsReview: boolean;
};

type Filter = "todos" | "revisar" | "progresan" | "inactivos" | "invitados";
type Sort = "atencion" | "nombre" | "actividad";

const SORT_LABEL: Record<Sort, string> = {
  atencion: "necesita atención",
  nombre: "nombre",
  actividad: "última actividad",
};

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** D2 — lista de alumnos con búsqueda, filtros y orden (todo en cliente). */
export function StudentList({ rows }: { rows: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<Sort>("atencion");
  const [sortOpen, setSortOpen] = useState(false);

  const counts = useMemo(
    () => ({
      todos: rows.length,
      revisar: rows.filter((r) => r.needsReview).length,
      progresan: rows.filter((r) => r.state === "progressing").length,
      inactivos: rows.filter((r) => r.state === "inactive").length,
      invitados: rows.filter((r) => r.state === "pending").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = rows.filter((r) => {
      if (filter === "revisar" && !r.needsReview) return false;
      if (filter === "progresan" && r.state !== "progressing") return false;
      if (filter === "inactivos" && r.state !== "inactive") return false;
      if (filter === "invitados" && r.state !== "pending") return false;
      if (!q) return true;
      return normalize(`${r.firstName} ${r.lastName} ${r.goal}`).includes(q);
    });
    const byName = (a: StudentRow, b: StudentRow) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "es");
    return filtered.sort((a, b) => {
      if (sort === "nombre") return byName(a, b);
      if (sort === "actividad") return (b.lastWorkoutAt ?? "").localeCompare(a.lastWorkoutAt ?? "") || byName(a, b);
      return b.score - a.score || byName(a, b);
    });
  }, [rows, query, filter, sort]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No tenés alumnos todavía"
        action={<LinkButton href={routes.teacher.newStudent}>Agregar alumno</LinkButton>}
      >
        Cargá a tu primer alumno y mandale el link de invitación para que vea su plan.
      </EmptyState>
    );
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "revisar", label: "Revisar" },
    { id: "progresan", label: "Progresan" },
    { id: "inactivos", label: "Inactivos" },
    ...(counts.invitados > 0 ? [{ id: "invitados" as const, label: "Invitados" }] : []),
  ];

  return (
    <>
      <div className="flex gap-2">
        <label className="flex h-12 flex-1 items-center gap-2.5 rounded-3xl bg-surface px-4 text-mute">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre u objetivo"
            aria-label="Buscar alumno"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-mute outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          aria-label="Ordenar"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface"
        >
          <FilterIcon />
        </button>
      </div>

      <PillRow>
        {filters.map((f) => (
          <PillButton key={f.id} size="lg" active={filter === f.id} count={counts[f.id]} onClick={() => setFilter(f.id)}>
            {f.label}
          </PillButton>
        ))}
      </PillRow>

      <div className="flex items-center justify-between px-1 text-[13px] text-mute">
        <span>
          Ordenado por: <span className="font-semibold text-ink">{SORT_LABEL[sort]}</span>
        </span>
        <span>Últimos 14 días</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={query ? `No encontramos alumnos con “${query}”` : "No hay alumnos en este filtro"}>
          Probá con otro nombre u objetivo, o cambiá el filtro.
        </EmptyState>
      ) : (
        <section className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {visible.map((r) => (
            <StudentRowItem key={r.id} row={r} />
          ))}
        </section>
      )}

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Ordenar por">
        {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
          <SheetOption
            key={s}
            label={SORT_LABEL[s].charAt(0).toUpperCase() + SORT_LABEL[s].slice(1)}
            selected={sort === s}
            onClick={() => {
              setSort(s);
              setSortOpen(false);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

function StudentRowItem({ row }: { row: StudentRow }) {
  return (
    <Link href={routes.teacher.student(row.id)} className="flex items-center gap-3 rounded-[22px] bg-surface p-3">
      <Avatar first={row.firstName} last={row.lastName} size={46} ring={row.ring} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">
            {row.firstName} {row.lastName}
          </span>
          <span className="shrink-0 text-[13px]" style={{ color: row.lastColor }}>
            {row.lastLabel}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-[92px] shrink-0 truncate text-xs text-mute">{row.goal}</span>
          <div className="grid h-2.5 flex-1 gap-0.5" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }} aria-label="Actividad de los últimos 14 días">
            {row.cells.map((on, i) => (
              <div key={i} className="rounded-[2px]" style={{ background: on ? "#D4F64A" : "#2E3036" }} />
            ))}
          </div>
        </div>
      </div>
      <Chip tone={row.chip.tone} className="min-w-[50px]">
        {row.chip.label}
      </Chip>
    </Link>
  );
}
