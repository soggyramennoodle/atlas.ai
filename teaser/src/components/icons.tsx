import React from "react";

// A few lucide-style line icons, traced to match the app's iconography
// (1.75 stroke, round caps). Only the handful the teaser actually shows.
const base = (children: React.ReactNode, size: number, color: string, fill = "none") => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

type P = { size?: number; color?: string };

export const Mic: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </>,
    size,
    color
  );

export const Clock: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </>,
    size,
    color
  );

export const SparklesIcon: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </>,
    size,
    color
  );

export const Flame: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-.5-.2-1-.4-1.4 2 1 3.4 3 3.4 5.4a5 5 0 0 1-10 0c0-4 3-6 5-11z" />,
    size,
    color
  );

export const LayoutDashboard: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>,
    size,
    color
  );

export const Newspaper: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5z" />
      <path d="M17 8h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2" />
      <line x1="7" y1="8" x2="14" y2="8" />
      <line x1="7" y1="12" x2="14" y2="12" />
      <line x1="7" y1="16" x2="11" y2="16" />
    </>,
    size,
    color
  );

export const Settings: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>,
    size,
    color
  );

export const BookOpen: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <path d="M12 6.5C10.5 5 7.5 4.5 4 5v13c3.5-.5 6.5 0 8 1.5" />
      <path d="M12 6.5C13.5 5 16.5 4.5 20 5v13c-3.5-.5-6.5 0-8 1.5" />
    </>,
    size,
    color
  );

export const ArrowRight: React.FC<P> = ({ size = 20, color = "currentColor" }) =>
  base(
    <>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </>,
    size,
    color
  );
