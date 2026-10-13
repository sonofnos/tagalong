import Redis from "ioredis";
import { Server as SocketIOServer } from "socket.io";

const ACTIVITY_CHANNEL_PREFIX = "activity:";

export interface AttendeeUpdateEvent {
  activityId: string;
  confirmedCount: number;
  waitlistedCount: number;
  capacity: number;
  reason: "rsvp" | "cancel" | "auto_promote";
}

/**
 * Wires Redis pub/sub to socket.io rooms. One backend process publishes an
 * update, every process (including itself) receives it via Redis and
 * forwards it to the socket.io room for that activity. This is what lets
 * web and mobile clients watching the same activity see RSVP changes live
 * instead of polling, and it stays correct if the backend is scaled to more
 * than one instance since the fanout goes through Redis, not process memory.
 */
export class RealtimeHub {
  private pub: Redis;
  private sub: Redis;
  private io: SocketIOServer;

  constructor(redisUrl: string, io: SocketIOServer) {
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);
    this.io = io;
  }

  async start(): Promise<void> {
    await this.sub.psubscribe(`${ACTIVITY_CHANNEL_PREFIX}*`);
    this.sub.on("pmessage", (_pattern, channel, message) => {
      const activityId = channel.slice(ACTIVITY_CHANNEL_PREFIX.length);
      this.io.to(roomFor(activityId)).emit("attendee_update", JSON.parse(message));
    });

    this.io.on("connection", (socket) => {
      socket.on("watch_activity", (activityId: string) => {
        socket.join(roomFor(activityId));
      });
      socket.on("unwatch_activity", (activityId: string) => {
        socket.leave(roomFor(activityId));
      });
    });
  }

  async publishAttendeeUpdate(event: AttendeeUpdateEvent): Promise<void> {
    await this.pub.publish(
      `${ACTIVITY_CHANNEL_PREFIX}${event.activityId}`,
      JSON.stringify(event)
    );
  }

  async close(): Promise<void> {
    await this.pub.quit();
    await this.sub.quit();
  }
}

function roomFor(activityId: string): string {
  return `activity:${activityId}`;
}
