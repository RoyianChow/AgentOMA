import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// better-auth owns every /api/auth/* endpoint (sign-in, sign-out, session,
// two-factor, …). All other routes are unaffected.
export const { GET, POST } = toNextJsHandler(auth.handler);
