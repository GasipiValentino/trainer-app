import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ChatIcon, CheckIcon, ListIcon, MeasureIcon } from "@/components/ui/icons";

/** Cabecera de D3: avatar 72 con anillo, nombre 26/700, subtítulo y chip de estado. */
export function ProfileHeader({
  firstName,
  lastName,
  ring,
  subtitle,
  status,
}: {
  firstName: string;
  lastName: string;
  ring: string;
  subtitle: string;
  status?: { label: string; tone: ChipTone };
}) {
  return (
    <section className="flex items-center gap-3.5 px-1">
      <span className="inline-flex shrink-0 rounded-full p-[3px]" style={{ width: 72, height: 72, border: `2.5px solid ${ring}` }}>
        <Avatar first={firstName} last={lastName} size={61} className="!h-full !w-full" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-[26px] font-bold tracking-[-0.03em]">
          {firstName} {lastName}
        </h1>
        <span className="text-[13px] text-mute">{subtitle}</span>
        {status && (
          <Chip tone={status.tone} size="sm" className="!h-[26px] self-start !rounded-[13px] !px-2.5">
            {status.label}
          </Chip>
        )}
      </div>
    </section>
  );
}

type QuickAction = { href?: string; label: string; icon: "chat" | "check" | "list" | "measure"; primary?: boolean; disabled?: string };

const ICON: Record<QuickAction["icon"], ReactNode> = {
  chat: <ChatIcon size={20} strokeWidth={2} />,
  check: <CheckIcon size={20} />,
  list: <ListIcon size={20} strokeWidth={2} />,
  measure: <MeasureIcon size={20} />,
};

/** Acciones rápidas de D3 (Escribir / Check-in / Rutina / Medir). */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="grid grid-cols-4 gap-2 lg:max-w-[440px]">
      {actions.map((a) => {
        const circle = (
          <span
            className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${
              a.primary ? "bg-lime text-bg" : "bg-surface text-ink"
            } ${a.disabled ? "opacity-40" : ""}`}
          >
            {ICON[a.icon]}
          </span>
        );
        const cls = "flex flex-col items-center gap-1.5 text-xs font-semibold";
        return a.href && !a.disabled ? (
          <Link key={a.label} href={a.href} className={cls}>
            {circle}
            {a.label}
          </Link>
        ) : (
          <span key={a.label} className={`${cls} text-mute`} title={a.disabled}>
            {circle}
            {a.label}
          </span>
        );
      })}
    </section>
  );
}
