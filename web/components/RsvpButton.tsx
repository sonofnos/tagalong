"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function RsvpButton({
  activityId,
  onRsvped,
}: {
  activityId: string;
  onRsvped: (status: "confirmed" | "waitlisted") => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ status: "confirmed" | "waitlisted" }>(
        `/activities/${activityId}/rsvp`,
        { method: "POST" }
      );
      onRsvped(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to rsvp");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Joining..." : "I'm in"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
