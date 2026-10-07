import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

/**
 * Variantes tomadas del diseño:
 *  primary   → "Guardar y asignar" (D5): lima, 56px, radio 28
 *  dashed    → "+ Ejercicio" (D5): borde punteado
 *  tonal     → "Recordar a los 6 que faltan" (D7): fondo #26282D
 *  outline   → "Ver reporte" / "Bajar la carga": borde #3A3C42
 * Deshabilitado = "Faltan 3 respuestas" (E4): fondo #26282D, texto mute.
 */
export type ButtonVariant = "primary" | "dashed" | "tonal" | "outline";
export type ButtonSize = "lg" | "md" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-lime text-bg font-bold hover:bg-lime-hover",
  dashed: "border-[1.5px] border-dashed border-line-soft text-ink font-semibold",
  tonal: "bg-raised text-ink font-semibold",
  outline: "border border-line text-ink font-semibold",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "h-14 rounded-[28px] px-6 text-[15px]",
  md: "h-11 rounded-[22px] px-5 text-sm",
  sm: "h-9 rounded-[18px] px-3 text-[13px]",
};

const DISABLED = "disabled:bg-raised disabled:text-mute disabled:border-transparent";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", extra = "") {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${VARIANT[variant]} ${SIZE[size]} ${DISABLED} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  pendingLabel?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "lg",
  pending = false,
  pendingLabel,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function LinkButton({ variant = "primary", size = "lg", className = "", ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/** Botón circular 44px de cabecera (volver, cerrar, más opciones). */
export function IconButton({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink ${className}`}
      {...rest}
    />
  );
}

export function IconLink({
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { "aria-label": string }) {
  return (
    <Link
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink ${className}`}
      {...rest}
    />
  );
}
