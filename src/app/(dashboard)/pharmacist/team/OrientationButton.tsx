"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { recordOrientationCompletion } from "./actions";

// Admin control: records the OCP minor-ailments orientation module completion
// on a colleague's profile. Until recorded, the orientation gate refuses every
// completion where that person is the prescriber.
export default function OrientationButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem" }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await recordOrientationCompletion(userId);
          setBusy(false);
          if (!res.ok) {
            setError(res.error ?? "Failed.");
            return;
          }
          router.refresh();
        }}
      >
        {busy ? "Recording…" : "Record orientation ✓"}
      </button>
      {error && (
        <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginLeft: "0.4rem" }}>
          {error}
        </span>
      )}
    </span>
  );
}
