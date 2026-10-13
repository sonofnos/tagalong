import { io, Socket } from "socket.io-client";
import { apiBaseUrl } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(apiBaseUrl(), { transports: ["websocket", "polling"] });
  }
  return socket;
}
