"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/icons";

/**
 * Compartir el link de invitación. El email transaccional depende de un SMTP
 * propio (pendiente); mientras tanto el profesor lo manda por donde ya habla
 * con su alumno: WhatsApp, copiar o el menú de compartir del teléfono.
 */
export function InviteShare({ url, firstName }: { url: string; firstName?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${firstName ? `Hola ${firstName}! ` : ""}Te sumé a mi app de entrenamiento. Creá tu contraseña acá: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invitación", text });
        return;
      } catch {
        // cancelado por el usuario
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-[18px] bg-raised py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-sm text-mute">{url}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar link"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[18px] bg-line px-3 text-[13px] font-semibold"
        >
          <CopyIcon size={16} />
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <Button type="button" onClick={share} className="w-full">
        Enviar invitación
      </Button>
      <p className="px-1 text-[13px] text-mute">El link vence en 14 días y sirve una sola vez.</p>
    </div>
  );
}
