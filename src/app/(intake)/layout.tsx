// Bare intake shell. No header, no footer, no site nav, no exit links — this is
// a kiosk screen. Just a <main> wrapper; TriageFlow paints its own full-viewport
// background (see TriageFlow.module.css .root), so the site's body background
// doesn't show through.
export default function IntakeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main>{children}</main>;
}
