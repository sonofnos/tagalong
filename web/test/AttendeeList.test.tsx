import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AttendeeList } from "@/components/AttendeeList";
import { Rsvp } from "@/lib/types";

const rsvps: Rsvp[] = [
  { id: "1", status: "confirmed", user_id: "u1", name: "Amani" },
  { id: "2", status: "confirmed", user_id: "u2", name: "Beatrice" },
  { id: "3", status: "waitlisted", user_id: "u3", name: "Charles" },
];

describe("AttendeeList", () => {
  it("lists confirmed attendees with the capacity count", () => {
    render(<AttendeeList rsvps={rsvps} capacity={2} />);
    expect(screen.getByText("Going (2/2)")).toBeInTheDocument();
    expect(screen.getByText("Amani")).toBeInTheDocument();
    expect(screen.getByText("Beatrice")).toBeInTheDocument();
  });

  it("lists waitlisted attendees separately", () => {
    render(<AttendeeList rsvps={rsvps} capacity={2} />);
    expect(screen.getByText("Waitlist (1)")).toBeInTheDocument();
    expect(screen.getByText("Charles")).toBeInTheDocument();
  });

  it("omits the waitlist section when nobody is waitlisted", () => {
    render(
      <AttendeeList
        rsvps={rsvps.filter((r) => r.status === "confirmed")}
        capacity={2}
      />
    );
    expect(screen.queryByText(/Waitlist/)).not.toBeInTheDocument();
  });
});
