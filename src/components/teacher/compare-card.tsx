"use client";

import { useState } from "react";
import { LineChart } from "@/components/ui/charts";
import { Segmented } from "@/components/ui/segmented";
import type { Comparison } from "@/lib/domain/progress";

/** Card "Comparar" de D4: dos modos, pregunta + respuesta y dos series. */
export function CompareCard({ comparisons }: { comparisons: Comparison[] }) {
  const [i, setI] = useState(0);
  const cur = comparisons[i];
  if (!cur) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
      {comparisons.length > 1 && (
        <Segmented
          variant="wide"
          label="Comparación"
          options={comparisons.map((c, idx) => ({ value: String(idx), label: c.label }))}
          value={String(i)}
          onChange={(v) => setI(Number(v))}
        />
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-[650] leading-tight">{cur.question}</span>
        <span className={`text-sm ${cur.positive ? "text-lime" : "text-coral"}`}>{cur.answer}</span>
      </div>
      <LineChart
        height={110}
        guides={3}
        endDot={false}
        label={`${cur.primary.label} y ${cur.secondary.label}`}
        series={[
          { values: cur.primary.values },
          ...(cur.secondary.values.length >= 2 ? [{ values: cur.secondary.values, color: "#9A9DA5", dashed: true }] : []),
        ]}
      />
      <div className="flex flex-wrap gap-4 text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-3.5 rounded-sm bg-lime" />
          {cur.primary.label}
        </span>
        {cur.secondary.values.length >= 2 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 border-t-2 border-dashed border-mute" />
            {cur.secondary.label}
          </span>
        )}
      </div>
    </section>
  );
}
