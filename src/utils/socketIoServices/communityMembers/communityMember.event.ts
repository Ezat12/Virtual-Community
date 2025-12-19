import { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import { Server, Socket } from "socket.io";
import { joinRequestSchema, notificationSchema } from "../../../schemas";
import { auditLogSchema } from "../../../schemas/auditLog";

type requestType = InferSelectModel<typeof joinRequestSchema>;
type auditLogsType = InferSelectModel<typeof auditLogSchema>;
type notificationType = InferSelectModel<typeof notificationSchema>;

export class CommunityMemberEvent {
  constructor(private io: Server) {}

  eventAdminUsers(communityId: number, request: requestType) {
    this.io
      .to(`community-admin:${communityId}:users`)
      .emit("joinRequest:new", request);
  }

  eventAditLogs(
    communityId: number,
    auditLogs: auditLogsType,
    socket?: Socket,
    includeSender?: boolean
  ) {
    if (includeSender && socket) {
      socket.to(`community:${communityId}`).emit("auditlogs:new", auditLogs);
    } else
      this.io.to(`community:${communityId}`).emit("auditlogs:new", auditLogs);
  }

  eventNotificationToUser(userId: number, notification: notificationType) {
    this.io.to(`user:${userId}`).emit("notification:new", notification);
  }

  eventLeaveUser(socket: Socket, communityId: number) {
    socket.leave(`community:${communityId}`);
  }
}
