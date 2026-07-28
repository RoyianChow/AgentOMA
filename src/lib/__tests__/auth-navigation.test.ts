import { describe, expect, it, vi } from "vitest";

import {
  enterPortalAfterAuthentication,
  PORTAL_HOME,
} from "../auth-navigation";

describe("post-authentication navigation", () => {
  it("forces a fresh protected-route request after the session cookie changes", () => {
    const replace = vi.fn();

    enterPortalAfterAuthentication({ replace });

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith(PORTAL_HOME);
  });
});
