"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import styles from "./record.module.css";

/**
 * Client overlay shell for the audit record dialog.
 *
 * PHI-SAFE BY CONSTRUCTION: this component receives `children` — the
 * server-rendered <RecordDetail> subtree — NOT the record data. Patient
 * identity is rendered to HTML on the server and streamed in; this shell only
 * adds the overlay chrome (backdrop, close, escape, focus management). It
 * cannot read the PHI as props, so nothing about the patient enters
 * client-side JavaScript.
 *
 * The dialog is named by the server-rendered patient heading
 * (id="audit-record-title" in RecordDetail) via aria-labelledby, and it
 * implements the WAI-ARIA modal pattern: focus moves into the panel on open,
 * Tab is trapped within it, and focus is restored to the trigger on close.
 *
 * Rendered by the intercepting route (@modal/(.)[id]) on a soft navigation
 * from a table row; a direct visit to /pharmacist/audit/[id] renders the full
 * page instead.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function RecordModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Remember what had focus (the table row link) so we can restore it.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so keyboard users land inside it, not on the
    // now-obscured trigger behind the backdrop.
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
        return;
      }
      if (e.key !== "Tab") return;
      // Trap Tab within the panel (the WAI-ARIA modal requirement that makes
      // aria-modal="true" honest for keyboard users).
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Lock background scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the trigger after the dialog closes.
      previouslyFocused?.focus?.();
    };
  }, [router]);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        // Backdrop click (outside the panel) closes.
        if (!panelRef.current?.contains(e.target as Node)) router.back();
      }}
      role="presentation"
    >
      <div
        className={styles.modalPanel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-record-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => router.back()}
          aria-label="Close"
          ref={closeRef}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
