import { checkinFlags } from "@/lib/domain/metrics";

type CheckinValues = {
  energy: number;
  sleep: number;
  stress: number;
  pain: number;
  motivation: number;
  workouts_done: number | null;
  workouts_planned: number | null;
};

/**
 * Grilla de respuestas de D7: 2 columnas, valor "2/5" y 5 segmentos.
 * Fuera de lo habitual → coral; normal → lima.
 */
export function CheckinMetrics({ c }: { c: CheckinValues }) {
  const flags = checkinFlags(c);
  const rows: { label: string; v: number; max: number; bad: boolean }[] = [
    { label: "Energía", v: c.energy, max: 5, bad: flags.energy },
    { label: "Sueño", v: c.sleep, max: 5, bad: flags.sleep },
    { label: "Estrés", v: c.stress, max: 5, bad: flags.stress },
    { label: "Dolor", v: c.pain, max: 5, bad: flags.pain },
    { label: "Motivación", v: c.motivation, max: 5, bad: flags.motivation },
  ];
  if (c.workouts_done != null && c.workouts_planned) {
    rows.push({ label: "Entrenos", v: c.workouts_done, max: c.workouts_planned, bad: false });
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {rows.map((m) => {
        const filled = Math.round((m.v / m.max) * 5);
        return (
          <div key={m.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-mute">{m.label}</span>
              <span className={`font-[650] ${m.bad ? "text-coral" : ""}`}>
                {m.v}/{m.max}
              </span>
            </div>
            <div className="grid h-1.5 grid-cols-5 gap-[3px]">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-[3px]"
                  style={{ background: i < filled ? (m.bad ? "#FF8F6B" : "#D4F64A") : "#2E3036" }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
