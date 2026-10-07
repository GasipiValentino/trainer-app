"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/auth/permissions";
import { NAV, activeHref, routes, showsBottomNav, type NavIcon } from "@/lib/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  HomeIcon,
  ListIcon,
  PlusIcon,
  TrendIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { CreateSheet } from "@/components/nav/create-sheet";

const ICONS: Record<NavIcon, (p: { size?: number }) => React.ReactNode> = {
  home: HomeIcon,
  users: UsersIcon,
  list: ListIcon,
  calendar: CalendarIcon,
  chat: ChatIcon,
  trend: TrendIcon,
  check: (p) => <CheckIcon size={p.size ?? 22} strokeWidth={1.9} />,
};

type AppNavProps = {
  role: Role;
  user: { firstName: string; lastName: string };
  unreadMessages?: number;
};

/** Barra inferior flotante (mobile, D1/E1) + barra superior (desktop, lámina 00). */
export function AppNav({ role, user, unreadMessages = 0 }: AppNavProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const active = activeHref(role, pathname);
  const items = NAV[role];
  const mobileItems = items.filter((i) => !i.desktopOnly);
  const accountHref = role === "teacher" ? routes.teacher.account : routes.student.account;

  const mobileCells = mobileItems.map((item) => {
    const Icon = ICONS[item.icon];
    const isActive = active === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex flex-col items-center gap-[3px] text-[10px] font-semibold ${isActive ? "text-lime" : "text-mute"}`}
      >
        <Icon size={22} />
        {item.label}
      </Link>
    );
  });

  // Profesor: FAB "+" central entre la 2.ª y 3.ª pestaña, como en D1.
  if (role === "teacher") {
    mobileCells.splice(
      2,
      0,
      <div key="fab" className="flex justify-center">
        {pathname.startsWith(routes.teacher.calendar) ? (
          // En la Agenda (D6) el "+" es directamente "Nuevo evento".
          <Link
            href={routes.teacher.newEvent}
            aria-label="Nuevo evento"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-lime text-bg"
          >
            <PlusIcon />
          </Link>
        ) : (
          <button
            type="button"
            aria-label="Crear"
            onClick={() => setCreateOpen(true)}
            className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-lime text-bg"
          >
            <PlusIcon />
          </button>
        )}
      </div>,
    );
  }

  return (
    <>
      {/* ---------------- desktop: barra superior ---------------- */}
      <header className="app-chrome sticky top-0 z-30 hidden border-b border-track bg-bg lg:block">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-7 px-8">
          <nav className="flex items-center gap-6 text-[15px]" aria-label="Principal">
            {items.map((item) => {
              const isActive = active === item.href;
              const showBadge = item.icon === "chat" && unreadMessages > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 border-b-2 pb-1 pt-[6px] font-semibold ${
                    isActive ? "border-lime text-lime" : "border-transparent text-mute hover:text-ink"
                  }`}
                >
                  {item.label}
                  {showBadge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-bg">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          {role === "teacher" && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-10 items-center gap-2 rounded-[20px] bg-lime px-4 text-sm font-bold text-bg"
            >
              <PlusIcon size={18} />
              Crear
            </button>
          )}
          <Link href={accountHref} aria-label="Mi cuenta">
            <Avatar first={user.firstName} last={user.lastName} size={40} tone={role === "teacher" ? "lime" : "neutral"} />
          </Link>
        </div>
      </header>

      {/* ---------------- mobile/tablet: barra inferior ---------------- */}
      {showsBottomNav(role, pathname) && (
        <nav
          aria-label="Principal"
          className="app-chrome fixed inset-x-4 bottom-6 z-30 mx-auto grid h-[68px] max-w-[560px] items-center rounded-[34px] bg-surface px-1.5 shadow-[0_-20px_40px_rgba(17,18,20,0.9)] lg:hidden"
          style={{ gridTemplateColumns: `repeat(${mobileCells.length}, minmax(0, 1fr))` }}
        >
          {mobileCells}
        </nav>
      )}

      {role === "teacher" && <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />}
    </>
  );
}
