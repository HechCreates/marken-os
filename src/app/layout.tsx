import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"

// Marken's face, from the original build. Weights stop at 400 — HIG Typography:
// "avoid Ultralight, Thin, and Light font weights."
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Marken OS",
  description: "Internal workspace for Marken — projects, reviews and delivery.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // never block zoom
  themeColor: "#1a1b12",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen bg-page text-label antialiased">
        {children}
      </body>
    </html>
  )
}
