import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import IntakeRecovery from "../IntakeRecovery";

describe("IntakeRecovery", () => {
  it("renders a generic recovery path without echoing an attempted identifier", () => {
    const html = renderToStaticMarkup(
      createElement(IntakeRecovery, { intakes: [] }),
    );

    expect(html).toContain("Choose a waiting intake");
    expect(html).toContain("For privacy");
    expect(html).toContain("Refresh waiting intakes");
    expect(html).not.toContain("expired");
    expect(html).not.toContain("consumed");
    expect(html).not.toContain("not found");
  });
});
