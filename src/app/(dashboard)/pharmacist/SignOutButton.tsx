"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

// Sign-out revokes the session SERVER-SIDE (better-auth deletes the session
// row), not just the cookie — required for shared pharmacy terminals.
export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
      }}
    >
      Sign out
    </button>
  );
}
