import Link from "next/link";
import {
  getDashboardStats,
  getPendingIntakeSessions,
  getRecentAssessments,
  type PendingIntake,
  type RecentAssessment,
} from "./actions";
import { requirePortalPage } from "@/lib/auth-guard";
import { AILMENT_LABELS, type AilmentId } from "@/config/triage";
import DashboardRefresher from "./DashboardRefresher";
import SignOutButton from "./SignOutButton";
import styles from "./Dashboard.module.css";

export const dynamic = "force-dynamic";

function ailmentLabel(code: string): string {
  const known = AILMENT_LABELS[code.toLowerCase() as AilmentId];
  if (known) return known;
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function expiresIn(iso: string): { label: string; soon: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  const mins = Math.max(0, Math.floor(diffMs / 60_000));
  const soon = mins < 20;
  if (mins < 60) return { label: `expires in ${mins}m`, soon };
  return { label: `expires in ${Math.floor(mins / 60)}h ${mins % 60}m`, soon };
}

const OUTCOME_LABELS: Record<string, string> = {
  rx_issued: "Rx Issued",
  no_rx_referral: "Referral",
  no_rx_otc_or_nonpharm: "OTC / Non-Pharm",
};

function QueueRow({ intake }: { intake: PendingIntake }) {
  const expiry = expiresIn(intake.expiresAt);
  return (
    <Link href={`/pharmacist/assessment?session=${intake.id}`} className={styles.queueRow}>
      <div className={styles.queueMain}>
        <div className={styles.queueAilment}>{ailmentLabel(intake.ailmentGroupCode)}</div>
        <div className={styles.queueMeta}>
          <span>Submitted {timeAgo(intake.createdAt)}</span>
          <span>{intake.trailLength} triage answers</span>
          {intake.priorCountSelfReport !== null && (
            <span>{intake.priorCountSelfReport}× prior (self-report)</span>
          )}
        </div>
      </div>
      <div className={styles.queueSide}>
        <span className="badge badge-accent">Ref: {intake.code}</span>
        <span className={`${styles.queueExpiry} ${expiry.soon ? styles.queueExpirySoon : ""}`}>
          {expiry.label}
        </span>
      </div>
    </Link>
  );
}

function RecentRow({ a }: { a: RecentAssessment }) {
  return (
    <li className={styles.recentRow}>
      <div>
        <div className={styles.recentName}>{a.patientName}</div>
        <div className={styles.recentMeta}>
          {ailmentLabel(a.ailmentGroupCode)} · {timeAgo(a.createdAt)}
        </div>
      </div>
      <span className="badge badge-accent">{OUTCOME_LABELS[a.outcome] ?? a.outcome}</span>
    </li>
  );
}

export default async function PharmacistDashboard() {
  // UX redirect for signed-out visitors. The actions below ALSO re-verify the
  // session themselves — that's the enforcement; this just avoids rendering an
  // empty dashboard.
  await requirePortalPage();

  const [stats, pending, recent] = await Promise.all([
    getDashboardStats(),
    getPendingIntakeSessions(),
    getRecentAssessments(8),
  ]);

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Pharmacist Dashboard</h1>
          <p className={styles.headerSub}>
            Patient intakes appear in the queue automatically as they finish triage.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <DashboardRefresher />
          <SignOutButton />
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statTile}>
          <div className={styles.statLabel}>Today&apos;s Assessments</div>
          <div className={styles.statValue}>{stats.todayAssessments}</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statLabel}>Pending Intakes</div>
          <div className={`${styles.statValue} ${styles.statValueAccent}`}>
            {stats.pendingIntakes}
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statLabel}>Est. Revenue Today</div>
          <div className={styles.statValue}>
            ${(stats.todayRevenueCents / 100).toFixed(2)}
          </div>
          <div className={styles.statHint}>Based on current PIN fees</div>
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Intake Queue</h2>
            <span className={styles.recentMeta}>
              {pending.sessions.length} waiting
            </span>
          </div>
          {pending.sessions.length > 0 ? (
            <div className={styles.queueList}>
              {pending.sessions.map((intake) => (
                <QueueRow key={intake.id} intake={intake} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No pending intakes — patients appear here as they finish triage.
            </div>
          )}
        </div>

        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Quick Actions</h2>
            </div>
            <div className={styles.actionsList}>
              <Link href="/pharmacist/assessment" className="btn btn-primary">
                Start Walk-in Assessment
              </Link>
              <Link href="/pharmacist/audit" className="btn btn-secondary">
                Ministry Audit Log
              </Link>
              <Link href="/pharmacist/settings" className="btn btn-secondary">
                Profile &amp; Settings
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Recent Assessments</h2>
              <Link href="/pharmacist/audit" className={styles.cardHeaderLink}>
                View all
              </Link>
            </div>
            {recent.length > 0 ? (
              <ul className={styles.recentList}>
                {recent.map((a) => (
                  <RecentRow key={a.id} a={a} />
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>No assessments recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
