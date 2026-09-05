import React from "react"

/**
 * Technology marks, hand-drawn as simplified SVG rather than fetched.
 * Used nominatively — to identify the tools the project actually uses.
 * Each is drawn on a 48-unit viewBox so they optically match at one size.
 */

type P = { size?: number; color?: string }

export const NextIcon: React.FC<P> = ({ size = 48, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="2.4" />
    <path d="M17 32V16l16 20" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31 16v13" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
  </svg>
)

export const ReactIcon: React.FC<P> = ({ size = 48, color = "#61DAFB" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="4" fill={color} />
    <g stroke={color} strokeWidth="2" fill="none">
      <ellipse cx="24" cy="24" rx="20" ry="7.6" />
      <ellipse cx="24" cy="24" rx="20" ry="7.6" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="20" ry="7.6" transform="rotate(120 24 24)" />
    </g>
  </svg>
)

export const TypeScriptIcon: React.FC<P> = ({ size = 48, color = "#3178C6" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="3" y="3" width="42" height="42" rx="6" fill={color} />
    <path d="M13 22h13M19.5 22v14" stroke="#fff" strokeWidth="3.1" strokeLinecap="round" />
    <path
      d="M42 25.5c-1.3-1.5-3-2.3-5-2.3-3 0-5 1.6-5 4 0 4.6 9 3.3 9 8.2 0 2.6-2.2 4.4-5.5 4.4-2.4 0-4.4-.9-5.7-2.5"
      stroke="#fff"
      strokeWidth="3.1"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

export const TailwindIcon: React.FC<P> = ({ size = 48, color = "#38BDF8" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path
      d="M14 21c1.3-5.3 4.6-8 10-8 8 0 9 6 13 7 2.7.7 5-.3 7-3-1.3 5.3-4.6 8-10 8-8 0-9-6-13-7-2.7-.7-5 .3-7 3Z"
      fill={color}
    />
    <path
      d="M4 33c1.3-5.3 4.6-8 10-8 8 0 9 6 13 7 2.7.7 5-.3 7-3-1.3 5.3-4.6 8-10 8-8 0-9-6-13-7-2.7-.7-5 .3-7 3Z"
      fill={color}
      opacity="0.75"
    />
  </svg>
)

export const SupabaseIcon: React.FC<P> = ({ size = 48, color = "#3ECF8E" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M26 3 8 26h14v19l18-23H26V3Z" fill={color} />
  </svg>
)

export const PostgresIcon: React.FC<P> = ({ size = 48, color = "#8FB4D9" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Simplified elephant head: dome, ears, trunk */}
    <path
      d="M24 6c9 0 15 6 15 14 0 6-2 10-4 14-1.4 2.8-2 5-2 7h-6c0-3 .6-5 1.6-7"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M24 6C15 6 9 12 9 20c0 6 2 10 4 14 1.4 2.8 2 5 2 7h6c0-3-.6-5-1.6-7"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M21 27c0 5 1.5 9 3 14"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="18" cy="19" r="1.9" fill={color} />
    <circle cx="30" cy="19" r="1.9" fill={color} />
  </svg>
)

export const VercelIcon: React.FC<P> = ({ size = 48, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M24 8 44 40H4L24 8Z" fill={color} />
  </svg>
)

export const LucideIcon: React.FC<P> = ({ size = 48, color = "#F56565" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path
      d="M24 40c-8 0-14-5-14-13 0-7 5-12 5-19 6 3 9 8 9 14 0-4 2-7 5-9 0 5 3 7 5 11 1.6 3.2 1.6 6 0 9"
      stroke={color}
      strokeWidth="2.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

export const ShieldIcon: React.FC<P> = ({ size = 48, color = "#FBFF12" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path
      d="M24 4 41 11v13c0 11-7 17-17 20-10-3-17-9-17-20V11L24 4Z"
      stroke={color}
      strokeWidth="2.6"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M16 24l6 6 11-12" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const TOOLS = [
  { name: "Next.js 16", role: "App Router, RSC", Icon: NextIcon },
  { name: "React 19", role: "Server Components", Icon: ReactIcon },
  { name: "TypeScript", role: "strict mode", Icon: TypeScriptIcon },
  { name: "Tailwind 4", role: "semantic tokens", Icon: TailwindIcon },
  { name: "Supabase", role: "auth, storage, RLS", Icon: SupabaseIcon },
  { name: "PostgreSQL", role: "policies and RPCs", Icon: PostgresIcon },
  { name: "Lucide", role: "iconography", Icon: LucideIcon },
  { name: "Vercel", role: "deployment", Icon: VercelIcon },
] as const
