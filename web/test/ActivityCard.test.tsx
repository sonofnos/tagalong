import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityCard } from "@/components/ActivityCard";
import { Activity } from "@/lib/types";

const baseActivity: Activity = {
  id: "activity-1",
  title: "Sunrise hike",
  description: "Up Ngong Hills before it gets hot",
  location: "Ngong Hills",
  starts_at: new Date("2026-11-01T06:00:00Z").toISOString(),
  capacity: 5,
  host_id: "host-1",
  host_name: "Amani",
  confirmed_count: 3,
};

describe("ActivityCard", () => {
  it("shows spots left when under capacity", () => {
    render(<ActivityCard activity={baseActivity} />);
    expect(screen.getByText("Sunrise hike")).toBeInTheDocument();
    expect(screen.getByTestId("spots-left")).toHaveTextContent("2 spots left");
  });

  it("shows a waitlist message when full", () => {
    render(<ActivityCard activity={{ ...baseActivity, confirmed_count: 5 }} />);
    expect(screen.getByTestId("spots-left")).toHaveTextContent("full, join the waitlist");
  });
});
