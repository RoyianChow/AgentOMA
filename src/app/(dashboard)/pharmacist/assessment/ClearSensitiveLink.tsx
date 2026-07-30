"use client";

import Link from "next/link";

import { requestSensitiveStateClear } from "@/lib/client-phi-lifecycle";

export default function ClearSensitiveLink({
  href,
  children,
  style,
}: {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Link href={href} style={style} onClick={requestSensitiveStateClear}>
      {children}
    </Link>
  );
}
