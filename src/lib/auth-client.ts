import { createAuthClient } from "better-auth/react";
import {
  twoFactorClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";

import type { auth } from "./auth";

/**
 * Browser-side auth client. Session state here is for UX only — every server
 * action independently re-verifies the session server-side (requireAuth).
 *
 * The sign-in flow must handle `twoFactorRedirect: true` in the sign-in
 * response by routing to the TOTP challenge. It must NOT offer "trust this
 * device" — pharmacy terminals are shared.
 */
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), inferAdditionalFields<typeof auth>()],
});
