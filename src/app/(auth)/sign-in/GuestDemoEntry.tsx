import Link from "next/link";

import styles from "./SignIn.module.css";

/**
 * Public entry to the synthetic product tour. This is deliberately a plain
 * link: it creates no auth session, grants no role, and never enters a
 * protected pharmacist route.
 */
export default function GuestDemoEntry() {
  return (
    <section className={styles.guestPanel} aria-labelledby="guest-demo-title">
      <span className={styles.guestTag}>Guest mode · Synthetic tour</span>
      <h2 id="guest-demo-title" className={styles.guestTitle}>
        Want to explore before signing in?
      </h2>
      <p className={styles.guestCopy}>
        Walk through the main workflow with made-up examples. Nothing is saved,
        no patient records are opened, and no claim is submitted.
      </p>
      <Link href="/demo" className={styles.guestLink}>
        Explore guest demo
      </Link>
      <p className={styles.guestBoundary}>
        This does not sign you in or grant access to the pharmacist portal.
      </p>
    </section>
  );
}
