export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  capacity: number;
  host_id: string;
  host_name: string;
  confirmed_count?: string | number;
}

export interface Rsvp {
  id: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  user_id: string;
  name: string;
}

export interface AttendeeUpdateEvent {
  activityId: string;
  confirmedCount: number;
  waitlistedCount: number;
  capacity: number;
  reason: "rsvp" | "cancel" | "auto_promote";
}

export interface Invite {
  id: string;
  code: string;
  activity_id: string;
  inviter_id: string;
}
