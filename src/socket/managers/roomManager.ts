import { Socket } from "socket.io";

export class RoomManager {
  static usersConnection = new Map<number, Set<string>>();

  constructor(private socket: Socket) {}

  get user() {
    return this.socket.data.user;
  }

  joinMember() {
    if (!this.user?.id) return;
    const userId = this.user.id;

    this.socket.join(`user:${userId}`);

    const set = RoomManager.usersConnection.get(userId) ?? new Set<string>();
    set.add(this.socket.id);

    RoomManager.usersConnection.set(userId, set);
  }

  joinCommunity(communityId: number) {
    if (!this.user?.id)
      return this.socket.emit("error-message", "Unauthorized");

    this.socket.join(`community:${communityId}`);
  }

  register(userId: number) {
    if (this.user?.id !== userId)
      return this.socket.emit("error-message", "Invalid register");

    const set = RoomManager.usersConnection.get(userId) ?? new Set<string>();

    set.add(this.socket.id);

    RoomManager.usersConnection.set(userId, set);
  }

  async joinAdmin(payload: {
    communityId: number;
    area: "users" | "posts" | "settings";
  }) {
    try {
      if (!this.user)
        return this.socket.emit("error", {
          code: 401,
          message: "Unauthenticated",
        });

      const room = `community-admin:${payload.communityId}:${payload.area}`;

      this.socket.join(room);
      this.socket.emit("joined-room", { room });
    } catch (err) {
      console.error("join-admin-room error", err);
      this.socket.emit("error", { code: 500, message: "Server error" });
    }
  }

  leaveAdmin(payload: { communityId: number; area: string }) {
    const room = `community-admin:${payload.communityId}:${payload.area}`;
    this.socket.leave(room);
  }

  disconnect() {
    const userId = this.user?.id;

    if (typeof userId === "number") {
      const set = RoomManager.usersConnection.get(userId);
      set?.delete(this.socket.id);

      if (!set || set.size === 0) {
        RoomManager.usersConnection.delete(userId);
      }
    } else {
      // fallback
      RoomManager.usersConnection.forEach((sockets, id) => {
        sockets.delete(this.socket.id);
        if (sockets.size === 0) {
          RoomManager.usersConnection.delete(id);
        }
      });
    }
  }
}
