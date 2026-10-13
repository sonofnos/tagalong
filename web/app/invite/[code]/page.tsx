"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken } from "@/lib/api";

interface InviteDetails {
  activity_id: string;
  title: string;
  starts_at: string;
  location: string;
  inviter_name: string;
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = usePromise(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ invite: InviteDetails }>(`/invites/${code}`)
      .then((res) => setInvite(res.invite))
      .catch((err) => setError(err instanceof Error ? err.message : "invite not found"));
  }, [code]);

  async function acceptInvite() {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    try {
      await apiFetch(`/invites/${code}/redeem`, { method: "POST" });
      if (invite) router.push(`/activities/${invite.activity_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to redeem invite");
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!invite) return <p>Loading...</p>;

  return (
    <main>
      <h1>{invite.inviter_name} invited you to {invite.title}</h1>
      <p>{invite.location}</p>
      <p>{new Date(invite.starts_at).toLocaleString()}</p>
      <button onClick={acceptInvite}>Join</button>
    </main>
  );
}
