"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Hoja inferior (mobile) / diálogo centrado (desktop). <dialog> nativo:
 * foco atrapado, Escape y fondo oscuro rgba(17,18,20,0.75) del diseño.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-0 mt-auto max-h-[90dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-[rgba(17,18,20,0.75)] lg:m-auto ${
        wide ? "lg:max-w-[560px]" : "lg:max-w-[440px]"
      }`}
    >
      <div className="mx-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col gap-1.5 overflow-y-auto rounded-t-[28px] bg-surface px-2 pb-8 pt-2 lg:rounded-[28px] lg:pb-3">
        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <span className="text-[17px] font-[650]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-raised"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Opción de hoja (fila #26282D radio 18) con check cuando está elegida. */
export function SheetOption({
  label,
  hint,
  selected,
  onClick,
  tone = "default",
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-raised px-4 py-3 text-left"
    >
      <span className="flex flex-col gap-0.5">
        <span className={`text-[15px] font-semibold ${tone === "danger" ? "text-coral" : ""}`}>{label}</span>
        {hint && <span className="text-[13px] text-mute">{hint}</span>}
      </span>
      {selected && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-lime" />}
    </button>
  );
}
