"use client";

/** "Descargar PDF": usa el diálogo de impresión del navegador (Guardar como PDF). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-9 items-center rounded-[18px] bg-lime px-3.5 text-[13px] font-bold text-bg"
    >
      Descargar PDF
    </button>
  );
}
