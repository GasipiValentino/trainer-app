import Link from "next/link";
import { ChatIcon } from "@/components/ui/icons";

/** Botón de mensajes de D1: círculo 44px con punto lima si hay sin leer. */
export function MessagesButton({ href, unread }: { href: string; unread: number }) {
  return (
    <Link
      href={href}
      aria-label={unread > 0 ? `Mensajes, ${unread} sin leer` : "Mensajes"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink lg:hidden"
    >
      <ChatIcon size={20} strokeWidth={1.8} />
      {unread > 0 && <span className="absolute right-[9px] top-[9px] h-[9px] w-[9px] rounded-full bg-lime" />}
    </Link>
  );
}
