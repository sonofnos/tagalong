"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Invite } from "@/lib/types";

export function InviteLink({ activityId }: { activityId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createInvite() {
    setError(null);
    try {
      const result = await apiFetch<{ invite: Invite }>(
        `/activities/${activityId}/invites`,
        { method: "POST" }
      );
      setLink(`${window.location.origin}/invite/${result.invite.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to create invite");
    }
  }

  return (
    <div>
      <button onClick={createInvite}>Invite a friend</button>
      {link && (
        <p>
          Share: <code data-testid="invite-link">{link}</code>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
