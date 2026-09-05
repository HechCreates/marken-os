import { loadFont } from "@remotion/google-fonts/Manrope"

/**
 * Marken's face. Named in theme.ts but it has to be loaded here or Remotion
 * renders a system fallback and the brand quietly disappears.
 */
const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
})

export const MANROPE = fontFamily
