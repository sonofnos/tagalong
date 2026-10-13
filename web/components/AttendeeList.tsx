import { Rsvp } from "@/lib/types";

export function AttendeeList({ rsvps, capacity }: { rsvps: Rsvp[]; capacity: number }) {
  const confirmed = rsvps.filter((r) => r.status === "confirmed");
  const waitlisted = rsvps.filter((r) => r.status === "waitlisted");

  return (
    <div data-testid="attendee-list">
      <h3>
        Going ({confirmed.length}/{capacity})
      </h3>
      <ul>
        {confirmed.map((r) => (
          <li key={r.user_id}>{r.name}</li>
        ))}
      </ul>
      {waitlisted.length > 0 && (
        <>
          <h3>Waitlist ({waitlisted.length})</h3>
          <ul>
            {waitlisted.map((r) => (
              <li key={r.user_id}>{r.name}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
