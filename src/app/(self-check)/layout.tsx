/**
 * The public self-check is deliberately isolated from both the marketing site
 * and the pharmacy-scoped intake. It has no site chrome and no pharmacy
 * context.
 */
export default function SelfCheckLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <main>{children}</main>;
}
