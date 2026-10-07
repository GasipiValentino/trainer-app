"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { BackIcon, PlayIcon, SearchIcon } from "@/components/ui/icons";
import { PillButton, PillRow } from "@/components/ui/pills";
import type { LibraryExercise } from "@/lib/data/routines";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const GROUP_ORDER = ["Pecho", "Espalda", "Hombros", "Piernas", "Brazos", "Core", "Cardio"];

/** D8 — Biblioteca de ejercicios: buscar, filtrar por músculo y elegir varios. */
export function ExerciseLibrary({
  exercises,
  dayLabel,
  onClose,
  onAdd,
}: {
  exercises: LibraryExercise[];
  dayLabel: string;
  onClose: () => void;
  onAdd: (items: LibraryExercise[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Todos");
  const [selected, setSelected] = useState<string[]>([]);

  // Escape cierra; el panel ocupa la pantalla y bloquea el scroll de atrás.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const groups = useMemo(() => {
    const present = [...new Set(exercises.map((e) => e.muscle_group))];
    return ["Todos", ...present.sort((a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99))];
  }, [exercises]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return exercises.filter(
      (e) =>
        (group === "Todos" || e.muscle_group === group) &&
        (!q || normalize(`${e.name} ${e.muscle_group} ${e.equipment ?? ""}`).includes(q)),
    );
  }, [exercises, query, group]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const n = selected.length;

  return (
    <div role="dialog" aria-modal="true" aria-label="Biblioteca de ejercicios" className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 px-4 pb-32 pt-[58px] lg:px-8 lg:pt-8">
        <header className="flex items-center gap-3">
          <IconButton aria-label="Volver a la rutina" onClick={onClose}>
            <BackIcon />
          </IconButton>
          <div className="flex flex-col">
            <span className="text-[13px] text-mute">Agregando a {dayLabel}</span>
            <span className="text-[22px] font-bold tracking-[-0.02em]">
              Ejercicios <span className="text-[15px] font-medium text-mute">{exercises.length}</span>
            </span>
          </div>
        </header>

        <label className="flex h-12 items-center gap-2.5 rounded-3xl bg-surface px-4 text-mute">
          <SearchIcon />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio, músculo o equipo"
            aria-label="Buscar ejercicio"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-mute outline-none"
          />
        </label>

        <PillRow>
          {groups.map((g) => (
            <PillButton key={g} active={group === g} onClick={() => setGroup(g)}>
              {g}
            </PillButton>
          ))}
        </PillRow>

        {visible.length === 0 ? (
          <p className="px-1 py-6 text-sm text-mute">No encontramos ejercicios con “{query}”.</p>
        ) : (
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((e) => {
              const on = selected.includes(e.id);
              return (
                <div key={e.id} className="relative">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${on ? "Quitar" : "Elegir"} ${e.name}`}
                    onClick={() => toggle(e.id)}
                    className={`flex w-full flex-col gap-2 rounded-[22px] border-2 bg-surface p-2 text-left ${on ? "border-lime" : "border-transparent"}`}
                  >
                    <div className="stripes relative flex h-[104px] items-center justify-center rounded-2xl">
                      {!e.video_url && (
                        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(17,18,20,0.75)] text-ink opacity-50">
                          <PlayIcon />
                        </span>
                      )}
                      <span
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-extrabold text-bg ${
                          on ? "bg-lime" : "border-[1.5px] border-ink bg-[rgba(17,18,20,0.6)]"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-1 pb-1">
                      <span className="text-sm font-[650] leading-tight">{e.name}</span>
                      <span className="text-xs text-mute">
                        {e.muscle_group}
                        {e.equipment ? ` · ${e.equipment}` : ""}
                      </span>
                    </div>
                  </button>
                  {e.video_url && (
                    <a
                      href={e.video_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver video de ${e.name}`}
                      className="absolute left-1/2 top-[45px] flex h-[34px] w-[34px] -translate-x-1/2 items-center justify-center rounded-full bg-[rgba(17,18,20,0.75)] text-ink"
                    >
                      <PlayIcon />
                    </a>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>

      <div className="fixed inset-x-4 bottom-7 mx-auto max-w-[560px] shadow-[0_-24px_40px_rgba(17,18,20,0.95)]">
        <button
          type="button"
          disabled={n === 0}
          onClick={() => onAdd(exercises.filter((e) => selected.includes(e.id)))}
          className="flex h-14 w-full items-center justify-center rounded-[28px] bg-lime text-[15px] font-bold text-bg disabled:bg-raised disabled:text-mute"
        >
          {n ? `Agregar ${n} ${n === 1 ? "ejercicio" : "ejercicios"}` : "Elegí ejercicios"}
        </button>
      </div>
    </div>
  );
}
