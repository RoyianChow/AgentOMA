import Link from "next/link";

import type { PendingIntake } from "../actions";
import { AILMENT_LABELS, type AilmentId } from "@/config/triage";

/**
 * The waiting-intake table on the assessment workspace. ZERO patient identity
 * appears here because the intake holds none by design — reference code,
 * ailment, and timing only.
 *
 * A row is a plain link to ?session=<id>: the click re-enters the page, which
 * loads the intake through the guarded getIntakeSessionById server action
 * (session + pharmacy scope + single-use + expiry re-checked SERVER-SIDE).
 * The client is never handed a blob it could replay — clicking a row is the
 * same trust path as typing the reference code by hand.
 *
 * The server action already filters to this pharmacy's unconsumed, unexpired
 * sessions, so "claimed" rows never appear here; "expired" can flash only in
 * the fetch-to-render window and is labelled honestly when it does.
 */

function ailmentLabel(code: string): string {
  const known = AILMENT_LABELS[code.toLowerCase() as AilmentId];
  if (known) return known;
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// The server action only returns unconsumed, unexpired rows, so this can only
// read "expired" for a page left open past an intake's expiry — and a click
// still re-validates server-side either way.
function statusOf(expiresAtIso: string): "pending" | "expired" {
  return new Date(expiresAtIso).getTime() < Date.now() ? "expired" : "pending";
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

const cellStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  fontSize: "0.85rem",
  borderBottom: "1px solid var(--border-color)",
  textAlign: "left",
};

export default function IntakeQueue({
  intakes,
  currentSessionId,
}: {
  intakes: PendingIntake[];
  currentSessionId: string | null;
}) {
  return (
    <div className="detail-section-card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ marginBottom: "0.25rem" }}>Waiting intakes</h3>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Click a row to load its triage answers into the workspace — identity is
        still keyed from the physical health card.
      </p>

      {intakes.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
          No intakes waiting.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Reference", "Ailment", "Created", "Status"].map((h) => (
                <th key={h} style={{ ...cellStyle, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {intakes.map((s) => {
              const status = statusOf(s.expiresAt);
              const isLoaded = s.id === currentSessionId;
              return (
                <tr key={s.id} style={isLoaded ? { background: "var(--primary-light)" } : undefined}>
                  <td style={cellStyle}>
                    <Link href={`/pharmacist/assessment?session=${s.id}`} style={{ fontWeight: 700 }}>
                      {s.code}
                    </Link>
                    {isLoaded && (
                      <span className="badge badge-accent" style={{ marginLeft: "0.5rem" }}>
                        loaded
                      </span>
                    )}
                  </td>
                  <td style={cellStyle}>{ailmentLabel(s.ailmentGroupCode)}</td>
                  <td style={cellStyle}>{timeAgo(s.createdAt)}</td>
                  <td style={cellStyle}>
                    <span style={status === "expired" ? { color: "var(--danger)" } : undefined}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
