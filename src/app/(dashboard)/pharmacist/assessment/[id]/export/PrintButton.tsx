"use client";

import styles from "./export.module.css";

export default function PrintButton() {
  return (
    <button
      className={`${styles.btn} ${styles.btnPrint}`}
      onClick={() => window.print()}
    >
      Print Claim Draft
    </button>
  );
}
