import type { SVGProps } from "react";

/**
 * Íconos -> Tamaño y grosor por defecto = los usados en la barra inferior.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, strokeWidth = 1.9, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    "aria-hidden": true,
    ...rest,
  } as const;
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)} strokeLinejoin="round"><path d="M4 11l8-6 8 6v9H4z" /></svg>
);
export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c2 .7 3.2 2.5 3.6 5.2" />
  </svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)} strokeLinecap="round"><path d="M5 6h14M5 12h14M5 18h9" /></svg>
);
export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)} strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
);
export const TrendIcon = (p: IconProps) => (
  <svg {...base(p)} strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l5-6 4 3 7-9" /></svg>
);
export const PlusIcon = ({ size = 24, strokeWidth = 2.4, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
export const CheckIcon = ({ size = 20, strokeWidth = 2, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })} strokeLinecap="round"><path d="M5 12l4 4 10-10" /></svg>
);
export const BackIcon = ({ size = 18, strokeWidth = 2.2, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })}><path d="M15 5l-7 7 7 7" /></svg>
);
export const CloseIcon = ({ size = 16, strokeWidth = 2.4, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ArrowRightIcon = ({ size = 16, strokeWidth = 2.4, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const SearchIcon = ({ size = 18, strokeWidth = 2, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const FilterIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base({ size, ...p })} strokeLinecap="round">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
export const MeasureIcon = ({ size = 20, strokeWidth = 2, ...p }: IconProps) => (
  <svg {...base({ size, strokeWidth, ...p })} strokeLinecap="round"><path d="M3 15l6-6 12 12M14 6l2-2M17 9l2-2" /></svg>
);
export const PlayIcon = ({ size = 14, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
export const CopyIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base({ size, ...p })} strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6.5A2.5 2.5 0 0013.5 4h-7A2.5 2.5 0 004 6.5v7A2.5 2.5 0 006.5 16H8" />
  </svg>
);
export const LogoutIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base({ size, ...p })} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 5H6a2 2 0 00-2 2v10a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9" />
  </svg>
);
