"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetOption } from "@/components/ui/sheet";

/** Botón "Últimos 3 meses" de D4 (borde #3A3C42) que abre la hoja de períodos. */
export function RangePicker({
  options,
  value,
  baseHref,
  param = "range",
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  baseHref: string;
  param?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 shrink-0 rounded-[18px] border border-line px-3 text-[13px] font-semibold"
      >
        {current.label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Período">
        {options.map((o) => (
          <SheetOption
            key={o.value}
            label={o.label}
            selected={o.value === value}
            onClick={() => {
              setOpen(false);
              router.push(`${baseHref}?${param}=${o.value}`, { scroll: false });
            }}
          />
        ))}
      </Sheet>
    </>
  );
}
