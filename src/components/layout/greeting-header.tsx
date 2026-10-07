import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";

/**
 * Cabecera de saludo de D1 (profesor) y E1 (alumno): avatar 46px, título 20/650,
 * subtítulo 13px mute y una acción a la derecha. El avatar lleva a la cuenta.
 */
type GreetingHeaderProps = {
  firstName: string;
  lastName: string;
  title: string;
  subtitle: string;
  accountHref: string;
  avatarTone?: "lime" | "neutral";
  action?: ReactNode;
};

export function GreetingHeader({
  firstName,
  lastName,
  title,
  subtitle,
  accountHref,
  avatarTone = "neutral",
  action,
}: GreetingHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-1 pb-1.5">
      <Link href={accountHref} aria-label="Mi cuenta" className="lg:hidden">
        <Avatar first={firstName} last={lastName} size={46} tone={avatarTone} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xl font-[650] tracking-[-0.01em]">{title}</span>
        <span className="text-[13px] text-mute">{subtitle}</span>
      </div>
      {action}
    </header>
  );
}
