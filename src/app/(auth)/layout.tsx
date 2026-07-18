// Bare auth shell — sign-in, TOTP enrollment, invitation acceptance. No site
// chrome: these screens sit in front of the PHI portal.
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main>{children}</main>;
}
