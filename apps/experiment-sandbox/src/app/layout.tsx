import type { Metadata } from "next";

import "./globals.css";

const SYNTHETIC_BANNER = "EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE";

export const metadata: Metadata = {
  title: "Synthetic experiment sandbox",
  description: "A local synthetic-only experiment boundary.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <div className="banner" role="status">{SYNTHETIC_BANNER}</div>
          {children}
        </main>
      </body>
    </html>
  );
}
