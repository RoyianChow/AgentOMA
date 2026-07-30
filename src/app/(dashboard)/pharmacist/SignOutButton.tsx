"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { requestSensitiveStateClear } from "@/lib/client-phi-lifecycle";

// Sign-out revokes the session SERVER-SIDE (better-auth deletes the session
// row), not just the cookie — required for shared pharmacy terminals.
export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        // Purge any mounted clinical form before the revocation request starts.
        // The signal contains no PHI and never leaves browser memory.
        requestSensitiveStateClear();
        await authClient.signOut();
        router.push("/sign-in");
      }}
    >
      Sign out
    </button>
  );
}
