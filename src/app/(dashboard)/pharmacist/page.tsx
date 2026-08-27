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
import { listFollowUps, type FollowUpWorkItem } from "@/lib/follow-ups";
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

const ROLE_LABELS: Record<string, string> = {
  pharmacy_admin: "Pharmacy administrator",
  pharmacist: "Pharmacist",
  intern: "Pharmacy intern",
  student: "Pharmacy student",
  technician: "Pharmacy technician",
};

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.arrowIcon}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function QueueRow({ intake }: { intake: PendingIntake }) {
  const expiry = expiresIn(intake.expiresAt);
  return (
    <li>
      <Link
        href={`/pharmacist/assessment?session=${intake.id}`}
        className={styles.queueRow}
      >
        <span className={styles.queueMarker} aria-hidden="true" />
        <div className={styles.queueMain}>
          <div className={styles.queueAilment}>
            {ailmentLabel(intake.ailmentGroupCode)}
          </div>
          <div className={styles.queueMeta}>
            <span>Submitted {timeAgo(intake.createdAt)}</span>
            <span>{intake.trailLength} triage answers</span>
            {intake.priorCountSelfReport !== null && (
              <span>{intake.priorCountSelfReport}× prior (self-report)</span>
            )}
          </div>
        </div>
        <div className={styles.queueSide}>
          <span className={styles.referenceCode}>Ref {intake.code}</span>
          <span
            className={`${styles.queueExpiry} ${expiry.soon ? styles.queueExpirySoon : ""}`}
          >
            {expiry.label}
          </span>
        </div>
        <span className={styles.rowAction}>
          <span className={styles.rowActionLabel}>Open</span>
          <ArrowIcon />
        </span>
      </Link>
    </li>
  );
}

function RecentRow({ a }: { a: RecentAssessment }) {
  return (
    <li className={styles.recentRow}>
      <Link href={`/pharmacist/audit/${a.id}`} className={styles.recentLink}>
        <div className={styles.recentMain}>
          <div className={styles.recentName}>{a.patientName}</div>
          <div className={styles.recentMeta}>
            {ailmentLabel(a.ailmentGroupCode)} · {timeAgo(a.createdAt)}
          </div>
        </div>
        <span className={styles.outcomeBadge}>
          {OUTCOME_LABELS[a.outcome] ?? a.outcome}
        </span>
        <ArrowIcon />
      </Link>
    </li>
  );
}

function FollowUpRow({ item }: { item: FollowUpWorkItem }) {
  return (
    <li className={styles.followUpRow}>
      <Link href="/pharmacist/follow-ups" className={styles.followUpLink}>
        <span>
          <span className={styles.recentName}>{item.patientName}</span>
          <span className={styles.followUpMeta}>
            {ailmentLabel(item.ailmentGroupCode)} · due {item.dueDate}
          </span>
        </span>
        <span className={styles.followUpSide}>
          {item.isOverdue && <span className={styles.overdueBadge}>Overdue</span>}
          <ArrowIcon />
        </span>
      </Link>
    </li>
  );
}

function WorkspaceLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={styles.workspaceLink}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowIcon />
    </Link>
  );
}

export default async function PharmacistDashboard() {
  // UX redirect for signed-out visitors. The actions below ALSO re-verify the
  // session themselves — that's the enforcement; this just avoids rendering an
  // empty dashboard.
  const actor = await requirePortalPage();

  const canManageFollowUps =
    actor.role === "pharmacy_admin" || actor.role === "pharmacist";
  const [stats, pending, recent, followUps] = await Promise.all([
    getDashboardStats(),
    getPendingIntakeSessions(),
    getRecentAssessments(8),
    canManageFollowUps ? listFollowUps(actor, 50) : Promise.resolve([]),
  ]);
  const activeFollowUps = followUps.filter((item) => item.isOpen);
  const overdueFollowUps = activeFollowUps.filter((item) => item.isOverdue).length;
  const openFollowUps = activeFollowUps.slice(0, 6);

  return (
    <main className={`${styles.page} animate-fade-in`}>
      <a href="#dashboard-work" className={styles.skipLink}>
        Skip to today&apos;s work
      </a>

      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Pharmacist dashboard</h1>
          <p className={styles.headerSub}>
            Review new patient handoffs, follow-up work, and today&apos;s completed
            assessments.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.sessionPill}>
            <span className={styles.liveDot} aria-hidden="true" />
            {ROLE_LABELS[actor.role] ?? actor.role}
          </span>
          <DashboardRefresher />
          <SignOutButton />
        </div>
      </header>

      <dl className={styles.stats} aria-label="Today at a glance">
        <div className={`${styles.statItem} ${styles.statItemPrimary}`}>
          <dt className={styles.statLabel}>Waiting intakes</dt>
          <dd className={`${styles.statValue} ${styles.statValueAccent}`}>
            {stats.pendingIntakes}
          </dd>
          <span className={styles.statHint}>Ready for pharmacist review</span>
        </div>
        <div className={styles.statItem}>
          <dt className={styles.statLabel}>Open follow-ups</dt>
          <dd className={styles.statValue}>{activeFollowUps.length}</dd>
          <span
            className={`${styles.statHint} ${overdueFollowUps > 0 ? styles.statHintDanger : ""}`}
          >
            {overdueFollowUps > 0
              ? `${overdueFollowUps} overdue`
              : "None overdue"}
          </span>
        </div>
        <div className={styles.statItem}>
          <dt className={styles.statLabel}>Assessments today</dt>
          <dd className={styles.statValue}>{stats.todayAssessments}</dd>
          <span className={styles.statHint}>Completed records</span>
        </div>
        <div className={styles.statItem}>
          <dt className={styles.statLabel}>Reference fee estimate</dt>
          <dd className={styles.statValue}>
            ${(stats.todayRevenueCents / 100).toFixed(2)}
          </dd>
          <span className={styles.statHint}>
            Completed assessments · not HNS adjudication
          </span>
        </div>
      </dl>

      <div id="dashboard-work" className={styles.columns} tabIndex={-1}>
        <section
          className={`${styles.card} ${styles.queueCard}`}
          aria-labelledby="queue-title"
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardHeadingCopy}>
              <h2 id="queue-title">Intake queue</h2>
              <p>Select a handoff to begin the pharmacist assessment.</p>
            </div>
            <span className={styles.countBadge}>
              {pending.sessions.length} waiting
            </span>
          </div>
          {pending.sessions.length > 0 ? (
            <ul className={styles.queueList}>
              {pending.sessions.map((intake) => (
                <QueueRow key={intake.id} intake={intake} />
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyTitle}>No patient handoffs are waiting.</span>
              <span>This queue refreshes automatically every 30 seconds.</span>
            </div>
          )}
        </section>

        <aside className={styles.rightCol} aria-label="Supporting work">
          {canManageFollowUps && (
            <section className={styles.card} aria-labelledby="follow-ups-title">
              <div className={styles.cardHeader}>
                <div className={styles.cardHeadingCopy}>
                  <h2 id="follow-ups-title">Follow-ups due</h2>
                  <p>
                    Follow-up remains owed even when a prescription is filled
                    elsewhere.
                  </p>
                </div>
                <Link href="/pharmacist/follow-ups" className={styles.cardHeaderLink}>
                  View all
                </Link>
              </div>
              {openFollowUps.length > 0 ? (
                <ul className={styles.followUpList}>
                  {openFollowUps.map((item) => (
                    <FollowUpRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyState}>No follow-ups are currently open.</div>
              )}
            </section>
          )}

          <nav className={styles.card} aria-labelledby="workspace-title">
            <div className={styles.cardHeader}>
              <div className={styles.cardHeadingCopy}>
                <h2 id="workspace-title">Workspace</h2>
                <p>Records, configuration, and pharmacy administration.</p>
              </div>
            </div>
            <div className={styles.actionsList}>
              <WorkspaceLink
                href="/pharmacist/audit"
                title="Assessment records"
                description="Review completed records and audit history"
              />
              <WorkspaceLink
                href="/pharmacist/settings"
                title="Profile and settings"
                description="Manage prescriber and pharmacy configuration"
              />
              {actor.role === "pharmacy_admin" && (
                <>
                  <WorkspaceLink
                    href="/pharmacist/team"
                    title="Pharmacy team"
                    description="Invite team members and record orientation"
                  />
                  <WorkspaceLink
                    href="/pharmacist/governance"
                    title="Record governance"
                    description="Retention, holds, exports, and corrections"
                  />
                </>
              )}
            </div>
          </nav>

          <section className={styles.card} aria-labelledby="recent-title">
            <div className={styles.cardHeader}>
              <div className={styles.cardHeadingCopy}>
                <h2 id="recent-title">Recent assessments</h2>
                <p>Latest completed records for this pharmacy.</p>
              </div>
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
          </section>
        </aside>
      </div>
    </main>
  );
}
