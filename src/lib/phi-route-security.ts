/**
 * Browser response policy for every authenticated pharmacist route.
 *
 * The CSP permits only same-origin scripts and connections, so analytics or
 * other third-party JavaScript cannot be introduced on PHI pages by accident.
 * `unsafe-inline`/`unsafe-eval` remain for Next.js runtime/dev compatibility;
 * neither permission grants a third-party origin.
 */
export const PHARMACIST_ROUTE_HEADERS = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
] as const;
