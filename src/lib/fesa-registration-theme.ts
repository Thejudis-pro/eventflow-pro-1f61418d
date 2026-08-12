/**
 * Exact palette from the "Inscription FESA 2026" / "Badges FESA 2026" design
 * mockups. Scoped to the registration flow (inscription, confirmation,
 * retrouver-mon-badge, badge rendering) — the rest of the site keeps its own
 * shadcn/oklch token system in src/styles.css.
 */
export const REG = {
  dark: "#0d3d21",
  green: "#0b7a3c",
  orange: "#e8722a",
  cream: "#fbf7f0",
  creamLight: "#f2ede3",
  line: "#e0d6c6",
  lineDark: "#ddd2c2",
  muted: "#5a6b62",
  mutedLight: "#7a8b81",
  body: "#42544a",
} as const;

/** The 6-color badge category palette (navy/green/gold/red/ink/slate). */
export const BADGE = {
  navy: "#0b2d5c",
  green: "#0b7a3c",
  gold: "#f2b632",
  red: "#b8321f",
  ink: "#201e1d",
  slate: "#5a6b8a",
} as const;

export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
