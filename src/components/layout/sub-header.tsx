import type { ReactNode } from "react";
import { IconLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";

/**
 * Cabecera de pantalla secundaria (D4, D8): volver + "contexto" 13px mute +
 * título 20–22/700, y una acción opcional a la derecha.
 */
export function SubHeader({
  backHref,
  eyebrow,
  title,
  aside,
  action,
}: {
  backHref: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <IconLink href={backHref} aria-label="Volver">
        <BackIcon />
      </IconLink>
      <div className="flex min-w-0 flex-1 flex-col">
        {eyebrow && <span className="text-[13px] text-mute">{eyebrow}</span>}
        <span className="truncate text-xl font-bold tracking-[-0.02em]">
          {title} {aside && <span className="text-[15px] font-medium text-mute">{aside}</span>}
        </span>
      </div>
      {action}
    </header>
  );
}
