"use client";

/* eslint-disable @next/next/no-img-element -- URLs firmadas de Storage, no optimizables por next/image */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { addPhotosAction, deletePhotosAction } from "@/lib/actions/students";
import { shortDate } from "@/lib/dates";
import type { Photo } from "@/lib/data/student-detail";

const KINDS = [
  { key: "front", label: "Frente" },
  { key: "side", label: "Perfil" },
  { key: "back", label: "Espalda" },
] as const;
type Kind = (typeof KINDS)[number]["key"];

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Pestaña Fotos: grilla por fecha + carga de frente/perfil/espalda. */
export function PhotosTab({ studentId, photos, today }: { studentId: string; photos: Photo[]; today: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({});
  const [date, setDate] = useState(today);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function pick(kind: Kind, file: File | undefined) {
    setMessage(null);
    if (!file) return setFiles((f) => ({ ...f, [kind]: undefined }));
    if (!TYPES[file.type]) return setMessage({ kind: "error", text: "Usá fotos JPG, PNG o WEBP." });
    if (file.size > MAX_BYTES) return setMessage({ kind: "error", text: "Cada foto puede pesar hasta 8 MB." });
    setFiles((f) => ({ ...f, [kind]: file }));
  }

  function upload() {
    const chosen = KINDS.filter((k) => files[k.key]);
    if (chosen.length === 0) return setMessage({ kind: "error", text: "Elegí al menos una foto." });
    start(async () => {
      const supabase = createClient();
      const paths: Partial<Record<Kind, string>> = {};
      for (const { key } of chosen) {
        const file = files[key]!;
        const path = `${studentId}/${crypto.randomUUID()}-${key}.${TYPES[file.type]}`;
        const { error } = await supabase.storage.from("progress-photos").upload(path, file, { contentType: file.type });
        if (error) {
          console.error("[photos.upload]", error);
          return setMessage({ kind: "error", text: "No pudimos subir las fotos. Intentá nuevamente." });
        }
        paths[key] = path;
      }
      const res = await addPhotosAction(studentId, { date, ...paths });
      if (!res.ok) return setMessage({ kind: "error", text: res.message ?? "No pudimos guardar las fotos." });
      setFiles({});
      setMessage({ kind: "success", text: "Fotos guardadas." });
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-3">
        {photos.length === 0 ? (
          <EmptyState title="Sin fotos todavía">Las fotos de progreso se guardan de forma privada: solo las ven vos y el alumno.</EmptyState>
        ) : (
          photos.map((p) => (
            <section key={p.id} className="flex flex-col gap-2.5 rounded-[24px] bg-surface px-[18px] py-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-[650]">{shortDate(p.date)}</span>
                <form action={deletePhotosAction.bind(null, studentId, p.id)}>
                  <button type="submit" className="text-[13px] font-semibold text-mute hover:text-coral">
                    Borrar
                  </button>
                </form>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map((k) =>
                  p.urls[k.key] ? (
                    <a key={k.key} href={p.urls[k.key]} target="_blank" rel="noreferrer" className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-raised">
                      <img src={p.urls[k.key]} alt={`${k.label} · ${shortDate(p.date)}`} className="h-full w-full object-cover" />
                      <span className="absolute bottom-2 left-2 text-xs font-semibold">{k.label}</span>
                    </a>
                  ) : (
                    <div key={k.key} className="stripes flex aspect-[3/4] items-end rounded-2xl p-2.5 text-xs font-semibold text-mute">
                      {k.label}
                    </div>
                  ),
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <section className="flex flex-col gap-3 self-start rounded-[24px] bg-surface px-[18px] py-4">
        <span className="text-base font-[650]">Cargar fotos</span>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        <TextField name="date" type="date" label="Fecha" onCard value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <label key={k.key} className="stripes flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-center text-xs font-semibold">
              <span>{k.label}</span>
              <span className="text-mute">{files[k.key] ? "Lista ✓" : "Elegir"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(k.key, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <Button type="button" size="md" pending={pending} pendingLabel="Subiendo…" onClick={upload}>
          Guardar fotos
        </Button>
      </section>
    </div>
  );
}
