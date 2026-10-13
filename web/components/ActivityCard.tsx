import Link from "next/link";
import { Activity } from "@/lib/types";

export function ActivityCard({ activity }: { activity: Activity }) {
  const confirmed = Number(activity.confirmed_count ?? 0);
  const spotsLeft = Math.max(activity.capacity - confirmed, 0);

  return (
    <li className="activity-card">
      <Link href={`/activities/${activity.id}`}>
        <h3>{activity.title}</h3>
      </Link>
      <p>{activity.location}</p>
      <p>{new Date(activity.starts_at).toLocaleString()}</p>
      <p data-testid="spots-left">
        {spotsLeft > 0 ? `${spotsLeft} spots left` : "full, join the waitlist"}
      </p>
      <p>hosted by {activity.host_name}</p>
    </li>
  );
}
