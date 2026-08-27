"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Dashboard.module.css";

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
    <div className={styles.refreshGroup}>
      <span className={styles.refreshStatus} aria-live="polite" aria-atomic="true">
        {lastUpdated
          ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          : "Updates every 30 sec"}
      </span>
      <button
        type="button"
        className={styles.refreshButton}
        onClick={() => {
          router.refresh();
          setLastUpdated(new Date());
        }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M15.5 6.5V3.75h-2.75" />
          <path d="M15.15 4.85A6.25 6.25 0 1 0 16 11" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
