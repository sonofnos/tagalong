"use client";

import { useEffect, useState, use as usePromise } from "react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Activity, Rsvp, AttendeeUpdateEvent } from "@/lib/types";
import { AttendeeList } from "@/components/AttendeeList";
import { RsvpButton } from "@/components/RsvpButton";
import { InviteLink } from "@/components/InviteLink";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ activity: Activity; rsvps: Rsvp[] }>(
        `/activities/${id}`
      );
      setActivity(res.activity);
      setRsvps(res.rsvps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load activity");
    }
  }

  useEffect(() => {
    // Initial fetch on mount, then refetch whenever the socket reports a
    // change to this activity's attendees. The set-state-in-effect rule
    // flags both calls to `load`, but this is the documented pattern for
    // "subscribe to an external system and sync local state from it".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const socket = getSocket();
    socket.emit("watch_activity", id);

    function handleUpdate(event: AttendeeUpdateEvent) {
      if (event.activityId === id) {
        load();
      }
    }
    socket.on("attendee_update", handleUpdate);

    return () => {
      socket.emit("unwatch_activity", id);
      socket.off("attendee_update", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!activity) return <p>Loading...</p>;

  return (
    <main>
      <h1>{activity.title}</h1>
      <p>{activity.description}</p>
      <p>{activity.location}</p>
      <p>{new Date(activity.starts_at).toLocaleString()}</p>
      <p>hosted by {activity.host_name}</p>

      <RsvpButton activityId={id} onRsvped={(status) => setMyStatus(status)} />
      {myStatus && <p>You are {myStatus}.</p>}

      <AttendeeList rsvps={rsvps} capacity={activity.capacity} />

      <InviteLink activityId={id} />
    </main>
  );
}
