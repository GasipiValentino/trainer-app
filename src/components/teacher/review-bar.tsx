import { Button } from "@/components/ui/button";
import { markReviewedAction } from "@/lib/actions/students";

/**
 * Paso 4 del recorrido diario (lámina 00): "Marcar como revisado y volver".
 * Barra fija abajo, con el mismo tratamiento que la de D5 (fondo + sombra).
 */
export function ReviewBar({
  studentId,
  keys,
  position,
  total,
  nextHref,
  hasNext,
}: {
  studentId: string;
  keys: string[];
  position: number | null;
  total: number;
  nextHref: string;
  hasNext: boolean;
}) {
  return (
    <div className="fixed inset-x-4 bottom-[104px] z-20 lg:bottom-7 mx-auto flex max-w-[560px] flex-col gap-2 bg-bg pt-2.5 shadow-[0_-24px_40px_rgba(17,18,20,0.95)]">
      {position != null && (
        <span className="px-1 text-center text-[13px] text-mute">
          Revisando {position} de {total}
        </span>
      )}
      <form action={markReviewedAction.bind(null, studentId, keys, nextHref)}>
        <Button type="submit" className="w-full">
          {hasNext ? "Marcar revisado y seguir" : "Marcar revisado y terminar"}
        </Button>
      </form>
    </div>
  );
}
