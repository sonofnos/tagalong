"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Activity } from "@/lib/types";
import { ActivityCard } from "@/components/ActivityCard";

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ activities: Activity[] }>("/activities")
      .then((res) => setActivities(res.activities))
      .catch((err) => setError(err instanceof Error ? err.message : "failed to load"));
  }, []);

  return (
    <main>
      <h1>tagalong</h1>
      <p>Find something to do, see who else is in, live.</p>
      <Link href="/activities/new">Host an activity</Link>
      {error && <p role="alert">{error}</p>}
      <ul data-testid="activity-list">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </ul>
      {activities.length === 0 && !error && <p>No activities yet.</p>}
    </main>
  );
}
