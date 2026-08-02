export const SYNTHETIC_BANNER =
  "EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE" as const;

export const SANDBOX_HEADERS = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "worker-src 'none'",
    ].join("; "),
  },
] as const;

export function responseHeaders(extra: Record<string, string> = {}): Headers {
  const headers = new Headers();
  for (const header of SANDBOX_HEADERS) headers.set(header.key, header.value);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return headers;
}
