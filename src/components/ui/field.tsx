import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Campos de formulario con el lenguaje del diseño:
 * etiqueta 14px mute (E4 "¿Algo que Valen deba saber?"), control #1C1D21
 * radio 20, texto 15px; error en coral debajo.
 */
// onCard: dentro de una card #1C1D21 el control sube a #26282D (como las filas de D1).
const control = (onCard?: boolean) =>
  `${onCard ? "bg-raised" : "bg-surface"} ` + CONTROL_BASE;

const CONTROL_BASE =
  "w-full min-w-0 rounded-[20px] px-4 text-[15px] text-ink placeholder:text-mute outline-none " +
  "focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-0 " +
  "aria-[invalid=true]:outline aria-[invalid=true]:outline-1 aria-[invalid=true]:outline-coral " +
  "disabled:opacity-60";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

export function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-1 text-sm text-mute">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="px-1 text-[13px] text-coral">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-[13px] text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  onCard?: boolean;
};

export function TextField({ name, label, error, hint, id, onCard, className = "", ...rest }: TextFieldProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`${control(onCard)} h-12 ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  label: ReactNode;
  error?: string;
  onCard?: boolean;
};

export function TextAreaField({ name, label, error, id, onCard, className = "", ...rest }: TextAreaFieldProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <FieldShell id={fieldId} label={label} error={error}>
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`${control(onCard)} min-h-[72px] resize-none py-3.5 ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label: ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onCard?: boolean;
};

export function SelectField({ name, label, error, id, options, placeholder, onCard, className = "", ...rest }: SelectFieldProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <FieldShell id={fieldId} label={label} error={error}>
      <select
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={`${control(onCard)} h-12 appearance-none ${className}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Mensaje de formulario: error (coral) o éxito (lima), con los tonos suaves del diseño. */
export function FormMessage({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const tone =
    kind === "error"
      ? "bg-[var(--coral-soft)] text-coral"
      : "bg-[var(--lime-soft)] text-lime";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-[18px] px-4 py-3 text-sm font-semibold ${tone}`}>
      {children}
    </p>
  );
}
