import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RsvpButton } from "@/components/RsvpButton";
import * as api from "@/lib/api";

describe("RsvpButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onRsvped with the status the backend returns", async () => {
    const spy = vi
      .spyOn(api, "apiFetch")
      .mockResolvedValue({ status: "confirmed" });
    const onRsvped = vi.fn();

    render(<RsvpButton activityId="activity-1" onRsvped={onRsvped} />);
    await userEvent.click(screen.getByRole("button", { name: "I'm in" }));

    expect(spy).toHaveBeenCalledWith("/activities/activity-1/rsvp", {
      method: "POST",
    });
    expect(onRsvped).toHaveBeenCalledWith("confirmed");
  });

  it("shows an error message when the request fails", async () => {
    vi.spyOn(api, "apiFetch").mockRejectedValue(new Error("activity not found"));
    render(<RsvpButton activityId="activity-1" onRsvped={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "I'm in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("activity not found");
  });
});
