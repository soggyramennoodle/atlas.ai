/**
 * Atlas brand tokens, lifted directly from the app's design system
 * (src/app/globals.css + src/app/icon.svg). Keeping these in one place so the
 * teaser reads as the real product, not an approximation.
 */
export const atlas = {
  // Light "rivo" canvas — the primary, designed-for treatment.
  bg: "#fbfbfb",
  ink: "#0d0d0d",
  card: "#ffffff",
  border: "#e6e6e6",
  muted: "#666666",
  secondary: "#f5f5f5",
  // Deep Atlas forest green (the brand), and its dark-mode emerald twin.
  primary: "#0a5736",
  primaryDark: "#2fcf94",
  // The near-black canvas from the app icon — used for the cold open + outro.
  night: "#08080C",
  // The living "AI" palette — emerald → teal → blue → violet → coral → honey.
  // This is the gradient that signals "Atlas made this".
  aiGradient: [
    "#12a36b",
    "#1ac4c0",
    "#3b82f6",
    "#8b5cf6",
    "#fb6f4c",
    "#ffb22e",
  ],
} as const;

export const aiGradientCss = (angle = 120) =>
  `linear-gradient(${angle}deg, ${atlas.aiGradient.join(", ")})`;

// The geometric interlocking "A" — the exact path from the Atlas identity.
export const ATLAS_MARK_PATH =
  "M44.72,0 53.86,0 73.37,36.18 73.27,36.69 71.95,37.5 67.78,39.74 67.28,39.63 52.85,13.11 53.05,30.28 63.41,49.19 63.92,49.9 64.33,49.8 76.93,42.89 98.68,82.42 100,84.96 99.9,85.57 96.75,90.96 96.04,90.85 49.59,65.75 4.88,90.55 3.35,90.96 0,85.26 0.2,84.65 44,1.32Z M45.73,13.01 11.18,79.07 23.78,72.15 45.33,31.81 45.93,30.59 45.93,13.11Z M49.39,38.41 34.76,66.26 57.83,53.35 49.8,38.52Z M73.78,52.13 67.28,55.79 75.2,70.83 76.73,72.56 88.72,78.96 74.29,52.13Z M60.87,59.35 56.91,61.59 56.91,61.89 64.84,66.16 61.38,59.45Z";
