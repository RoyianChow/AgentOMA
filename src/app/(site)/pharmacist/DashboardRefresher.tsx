"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 30_000;

export default function DashboardRefresher() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setLastUpdated(new Date());
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
        {lastUpdated
          ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          : "Live"}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "0.35rem 0.9rem", fontSize: "0.85rem" }}
        onClick={() => {
          router.refresh();
          setLastUpdated(new Date());
        }}
      >
        Refresh
      </button>
    </div>
  );
}
