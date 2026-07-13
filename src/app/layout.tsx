import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Bricolage_Grotesque,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

// Site fonts (unchanged).
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Intake fonts. Loaded here (not in site CSS) so the (intake) route group gets
// them without depending on the marketing design system.
//   Bricolage Grotesque → questions & outcome headings (the hero of each screen)
//   IBM Plex Sans        → body & options
//   IBM Plex Mono        → eyebrow labels & the handoff code
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AgentOMA - AI-Powered Minor Ailments Triaging",
  description:
    "Advanced assessment and triage platform connecting patients with pharmacists for efficient minor ailment care.",
};

// Root layout owns ONLY <html>, <body>, fonts, and globals.css. Header/footer
// live in the (site) layout; the (intake) layout is bare. Nested layouts nest,
// so chrome is added per route group rather than suppressed from below.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{ height: "100%" }}
    >
      <body style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}
