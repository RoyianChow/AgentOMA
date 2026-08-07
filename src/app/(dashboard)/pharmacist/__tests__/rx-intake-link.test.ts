import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The Rx Intake entry point on the pharmacist dashboard.
 *
 * The route can be perfectly built and still be unreachable, or — worse —
 * reachable when the experiment is switched off. This renders the real
 * dashboard and asserts the link appears exactly when it should.
 *
 * Database-backed reads are mocked; they are not what is under test here and
 * have their own `.db.test.ts` coverage against real Postgres.
 */

const envMock = vi.hoisted(() => ({
  AI_KILL_SWITCH: false as boolean,
  RX_INTAKE_SYNTHETIC_ENABLED: true as boolean,
  RX_INTAKE_EXPIRES_ON: undefined as string | undefined,
}));

const authMock = vi.hoisted(() => ({ requirePortalPage: vi.fn() }));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return { ...actual, requirePortalPage: authMock.requirePortalPage };
});

vi.mock("../actions", () => ({
  getDashboardStats: vi.fn(async () => ({
    todayAssessments: 0,
    pendingIntakes: 0,
    todayRevenueCents: 0,
  })),
  getPendingIntakeSessions: vi.fn(async () => ({ sessions: [] })),
  getRecentAssessments: vi.fn(async () => []),
}));

vi.mock("@/lib/follow-ups", () => ({ listFollowUps: vi.fn(async () => []) }));

// Header chrome, stubbed out. Both call client-only Next hooks (`useRouter`)
// that need App Router context a static render cannot provide. Neither is
// related to the Rx Intake link, so replacing them keeps the failure surface
// on what this file actually tests.
vi.mock("../DashboardRefresher", () => ({ default: () => null }));
vi.mock("../SignOutButton", () => ({ default: () => null }));

const { default: PharmacistDashboard } = await import("../page");

function configure(role: string, overrides: Partial<typeof envMock> = {}) {
  envMock.AI_KILL_SWITCH = false;
  envMock.RX_INTAKE_SYNTHETIC_ENABLED = true;
  envMock.RX_INTAKE_EXPIRES_ON = undefined;
  Object.assign(envMock, overrides);
  authMock.requirePortalPage.mockResolvedValue({
    userId: "user-1",
    pharmacyId: "pharmacy-1",
    role,
    name: "Test User",
    email: "test@example.com",
    supervisingPharmacistId: null,
  });
}

async function renderDashboard(): Promise<string> {
  return renderToStaticMarkup(await PharmacistDashboard());
}

describe("the link is reachable when the experiment is on", () => {
  it.each(["pharmacist", "pharmacy_admin"])("is shown to %s", async (role) => {
    configure(role);
    const html = await renderDashboard();

    expect(html).toContain('href="/pharmacist/rx-intake"');
    expect(html).toContain("Rx Intake (synthetic)");
  });

  it("labels the link as synthetic on the dashboard itself", async () => {
    configure("pharmacist");
    const html = await renderDashboard();
    // A pharmacist scanning Quick Actions should not have to open the page to
    // learn it is an experiment.
    expect(html).toMatch(/Rx Intake \(synthetic\)/);
  });

  it("sits alongside the existing quick actions rather than replacing them", async () => {
    configure("pharmacy_admin");
    const html = await renderDashboard();

    expect(html).toContain('href="/pharmacist/audit"');
    expect(html).toContain('href="/pharmacist/settings"');
    expect(html).toContain('href="/pharmacist/governance"');
    expect(html).toContain('href="/pharmacist/rx-intake"');
  });
});

describe("the link disappears when the experiment is off", () => {
  it.each([
    ["kill switch", { AI_KILL_SWITCH: true }],
    ["flag off", { RX_INTAKE_SYNTHETIC_ENABLED: false }],
    ["expired", { RX_INTAKE_EXPIRES_ON: "2020-01-01" }],
  ])("is hidden by %s", async (_label, overrides) => {
    configure("pharmacist", overrides as Partial<typeof envMock>);
    const html = await renderDashboard();

    expect(html).not.toContain("/pharmacist/rx-intake");
    expect(html).not.toContain("Rx Intake");
  });

  it("leaves the rest of the dashboard intact when hidden", async () => {
    configure("pharmacist", { AI_KILL_SWITCH: true });
    const html = await renderDashboard();

    expect(html).toContain("Pharmacist Dashboard");
    expect(html).toContain('href="/pharmacist/audit"');
  });
});

describe("roles that cannot use the capability do not see it", () => {
  // The action refuses these roles anyway. Showing them a link to a page that
  // will refuse them is a worse experience than not showing it.
  it.each(["intern", "student", "technician"])("is hidden from %s", async (role) => {
    configure(role);
    const html = await renderDashboard();
    expect(html).not.toContain("/pharmacist/rx-intake");
  });
});
