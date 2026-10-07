/** Bloque skeleton con la forma de las cards del diseño. */
export function Skeleton({ className = "", radius = 24 }: { className?: string; radius?: number }) {
  return <div aria-hidden className={`skeleton ${className}`} style={{ borderRadius: radius }} />;
}

/** Skeleton genérico de pantalla: cabecera + bloques. */
export function PageSkeleton() {
  return (
    <main
      aria-busy
      aria-label="Cargando"
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 pb-32 pt-[58px] lg:px-8 lg:pt-8"
    >
      <div className="flex items-center gap-3 px-1 pb-1.5">
        <Skeleton className="h-[46px] w-[46px]" radius={999} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-44" radius={8} />
          <Skeleton className="h-3.5 w-56" radius={8} />
        </div>
      </div>
      <Skeleton className="h-[180px] w-full" radius={28} />
      <Skeleton className="h-[120px] w-full" />
      <Skeleton className="h-[260px] w-full" />
    </main>
  );
}
