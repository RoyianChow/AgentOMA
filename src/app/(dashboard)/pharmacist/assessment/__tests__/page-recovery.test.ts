import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  getIntakeSessionById: vi.fn(),
  getPendingIntakeSessions: vi.fn(),
}));

vi.mock("../../actions", () => actionMocks);
vi.mock("@/lib/auth-guard", () => ({
  requirePortalPage: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000001",
    pharmacyId: "00000000-0000-4000-8000-000000000002",
    role: "pharmacist",
  })),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import AssessmentPage from "../page";

describe("pharmacist assessment handoff recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.getPendingIntakeSessions.mockResolvedValue({
      success: true,
      sessions: [],
    });
    actionMocks.getIntakeSessionById.mockResolvedValue({
      success: false,
      error: "safe unavailable response",
    });
  });

  it("renders the recovery state when the session parameter is missing", async () => {
    const result = await AssessmentPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(result);

    expect(html).toContain("Choose a waiting intake");
    expect(actionMocks.getIntakeSessionById).not.toHaveBeenCalled();
  });

  it("renders the identical recovery state when a supplied session is unavailable", async () => {
    const missing = await AssessmentPage({ searchParams: Promise.resolve({}) });
    const unavailable = await AssessmentPage({
      searchParams: Promise.resolve({ session: "attempted-session-value" }),
    });

    expect(renderToStaticMarkup(unavailable)).toBe(renderToStaticMarkup(missing));
    expect(actionMocks.getIntakeSessionById).toHaveBeenCalledWith(
      "attempted-session-value",
    );
  });
});
