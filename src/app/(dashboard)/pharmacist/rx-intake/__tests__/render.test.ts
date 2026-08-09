import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Does the route actually render?
 *
 * Everything else in this capability is tested headlessly — the parser against
 * fixtures, the gate against env, the action against mocks. None of that catches
 * a page that throws on mount, a workspace wired to the wrong props, or a
 * disabled experiment that renders its controls anyway.
 *
 * The pharmacist portal needs a session and a TOTP code, so the running page
 * cannot be driven from here. Server-rendering the components is the next best
 * thing and catches the failures that matter: crash on render, missing
 * labelling, and controls appearing when the capability is off.
 *
 * Written with `createElement` rather than JSX because the vitest config only
 * collects `src/**\/*.test.ts` — a `.tsx` test would be silently skipped.
 */

const envMock = vi.hoisted(() => ({
  AI_KILL_SWITCH: false as boolean,
  RX_INTAKE_SYNTHETIC_ENABLED: true as boolean,
  RX_INTAKE_EXPIRES_ON: undefined as string | undefined,
}));

const authMock = vi.hoisted(() => ({
  requirePortalPage: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return { ...actual, requirePortalPage: authMock.requirePortalPage };
});

const { default: RxIntakeWorkspace } = await import("../RxIntakeWorkspace");
const { default: RxIntakePage } = await import("../page");
const { listFixtureSummaries } = await import("@/lib/rx-intake/corpus");

function configure(overrides: Partial<typeof envMock> = {}) {
  envMock.AI_KILL_SWITCH = false;
  envMock.RX_INTAKE_SYNTHETIC_ENABLED = true;
  envMock.RX_INTAKE_EXPIRES_ON = undefined;
  Object.assign(envMock, overrides);
  authMock.requirePortalPage.mockResolvedValue({
    userId: "user-1",
    pharmacyId: "pharmacy-1",
    role: "pharmacist",
    name: "Test Pharmacist",
    email: "test@example.com",
    supervisingPharmacistId: null,
  });
}

async function renderPage(): Promise<string> {
  // An async server component returns a promise of an element; awaiting it
  // gives something renderToStaticMarkup can handle.
  const element = await RxIntakePage();
  return renderToStaticMarkup(element);
}

describe("the workspace renders", () => {
  it("mounts without throwing", () => {
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, {
        fixtures: listFixtureSummaries(),
        expiresOn: null,
      }),
    );
    expect(html.length).toBeGreaterThan(200);
  });

  it("offers every corpus fixture in the picker", () => {
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, {
        fixtures: listFixtureSummaries(),
        expiresOn: null,
      }),
    );
    for (const fixture of listFixtureSummaries()) {
      expect(html, fixture.id).toContain(fixture.label);
      expect(html).toContain(`value="${fixture.id}"`);
    }
  });

  it("shows the run control and the selected fixture's intent", () => {
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, {
        fixtures: listFixtureSummaries(),
        expiresOn: null,
      }),
    );
    expect(html).toContain("Run extraction");
    expect(html).toContain(listFixtureSummaries()[0].intent);
  });

  it("shows the expiry when the experiment has one", () => {
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, {
        fixtures: listFixtureSummaries(),
        expiresOn: "2026-12-31",
      }),
    );
    expect(html).toContain("2026-12-31");
  });

  it("does not show a draft, or any field, before extraction runs", () => {
    // The draft panels are conditional on an extraction existing. If they
    // rendered eagerly, a reviewer could see empty fields that look like a
    // reading of the document.
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, {
        fixtures: listFixtureSummaries(),
        expiresOn: null,
      }),
    );
    expect(html).not.toContain("Untrusted draft");
    expect(html).not.toContain("Record your disposition");
    expect(html).not.toContain("Directions (Sig)");
    expect(html).not.toContain("Document integrity");
  });

  it("renders nothing to run when the corpus is empty", () => {
    const html = renderToStaticMarkup(
      createElement(RxIntakeWorkspace, { fixtures: [], expiresOn: null }),
    );
    expect(html).toContain("Run extraction");
    expect(html).toContain("disabled");
  });
});

describe("the page renders", () => {
  it("shows the workspace when the capability is enabled", async () => {
    configure();
    const html = await renderPage();

    expect(html).toContain("Prescription intake");
    expect(html).toContain("AI-RX-06");
    expect(html).toContain("Run extraction");
    expect(html).not.toContain("Capability disabled");
  });

  it("states the boundary on every render", async () => {
    configure();
    const html = await renderPage();

    // These four claims are the reason the surface is allowed to exist. If a
    // redesign drops them, this fails.
    expect(html).toContain("Synthetic only");
    expect(html).toContain("No model");
    expect(html).toContain("Nothing is saved");
    expect(html).toContain("Not a chartered capability");
  });

  it("links back to the dashboard", async () => {
    configure();
    const html = await renderPage();
    expect(html).toContain('href="/pharmacist"');
  });

  it.each([
    ["kill switch", { AI_KILL_SWITCH: true }, /kill switch/i],
    ["flag off", { RX_INTAKE_SYNTHETIC_ENABLED: false }, /switched off/i],
    ["expired", { RX_INTAKE_EXPIRES_ON: "2020-01-01" }, /expiry/i],
  ])("hides the controls when disabled by %s", async (_label, overrides, reason) => {
    configure(overrides as Partial<typeof envMock>);
    const html = await renderPage();

    expect(html).toContain("Capability disabled");
    expect(html).toMatch(reason);
    // The refusal must not still ship the working controls behind it.
    expect(html).not.toContain("Run extraction");
    expect(html).not.toContain("<select");
  });

  it("still states the boundary when disabled", async () => {
    configure({ AI_KILL_SWITCH: true });
    const html = await renderPage();
    expect(html).toContain("Synthetic only");
  });

  it("guards the page with the assessing roles", async () => {
    configure();
    await renderPage();
    expect(authMock.requirePortalPage).toHaveBeenCalledWith([
      "pharmacy_admin",
      "pharmacist",
    ]);
  });
});
