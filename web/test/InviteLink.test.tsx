import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InviteLink } from "@/components/InviteLink";
import * as api from "@/lib/api";

describe("InviteLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a shareable link after creating an invite", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      invite: { id: "i1", code: "abc123", activity_id: "a1", inviter_id: "u1" },
    });

    render(<InviteLink activityId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "Invite a friend" }));

    expect(await screen.findByTestId("invite-link")).toHaveTextContent("abc123");
  });
});
