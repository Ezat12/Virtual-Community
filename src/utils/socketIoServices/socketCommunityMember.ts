import { Server, Socket } from "socket.io";
import { HandlerError } from "./handlerError";
import { number, unknown } from "zod";
import { joinRequestPayload } from "../../middleware/validation/validateCommunityMemberShip";
import { NotificationService } from "../notificationService";
import { db } from "../../db";
import {
  communitiesSchema as Community,
  communityMembershipsSchema as CommunityMemberShip,
  joinRequestSchema,
} from "../../schemas";
import { and, eq } from "drizzle-orm";
import { auditLogSchema } from "../../schemas/auditLog";

export class SocketCommunityMember extends HandlerError {
  constructor(private io: Server) {
    super();
  }

  CommunityMemberHandler(socket: Socket) {
    socket.on("add-member", (data) => {
      this.addMember(socket, data);
    });

    socket.on("leave-member", (data) => {
      this.leaveMember(socket, data);
    });
  }

  private async addMember(socket: Socket, data: { communityId: number }) {
    try {
      const userId = socket.data.user.id;

      if (!userId) {
        return socket.emit("error-message", "UnAuthentication");
      }

      const { community } = await joinRequestPayload(data.communityId, userId);

      const [existingMember] = await db
        .select()
        .from(CommunityMemberShip)
        .where(
          and(
            eq(CommunityMemberShip.userId, userId),
            eq(CommunityMemberShip.communityId, community.id)
          )
        );

      // Check if user had membership before
      if (existingMember) {
        if (!existingMember.removedAt) {
          return socket.emit("error-message", "You are already a member");
          // return next(new ApiError("You are already a member", 400));
        }

        if (existingMember.removedBy) {
          const [joinRequest] = await db
            .insert(joinRequestSchema)
            .values({
              communityId: community.id,
              userId,
              status: "pending",
            })
            .returning();

          return socket.emit(
            "success-message",
            "Your join request is pending approval"
          );

          // return res.status(201).json({
          //   status: "success",
          //   message: "Your join request is pending approval",
          //   data: joinRequest,
          // });
        }

        if (community.privacy === "public") {
          const [reactivated] = await db
            .update(CommunityMemberShip)
            .set({ removedAt: null, removedBy: null })
            .where(eq(CommunityMemberShip.id, existingMember.id))
            .returning();

          const [auditLogs] = await db
            .insert(auditLogSchema)
            .values({
              communityId: community.id,
              actorId: userId,
              targetId: userId,
              action: "join",
              visibility: "public",
            })
            .returning();

          this.io
            .to(`community:${community.id}`)
            .emit("auditlogs:new", auditLogs);

          const [notification] = await NotificationService.joinedCommunity(
            userId,
            community.name
          );

          this.io.to(`user:${userId}`).emit("notification:new", notification);

          return socket.emit(
            "success-message",
            "Welcome back to the community"
          );

          // return res.status(200).json({
          //   status: "success",
          //   message: "Welcome back to the community",
          //   data: reactivated,
          // });
        } else {
          const [joinRequest] = await db
            .insert(joinRequestSchema)
            .values({
              communityId: community.id,
              userId,
              status: "pending",
            })
            .returning();

          return socket.emit(
            "success-message",
            "Your join request is pending approval"
          );

          // return res.status(201).json({
          //   status: "success",
          //   message: "Your join request is pending approval",
          //   data: joinRequest,
          // });
        }
      }

      // First time joining
      if (community.privacy === "public") {
        const [communityMemberShip] = await db
          .insert(CommunityMemberShip)
          .values({ userId, communityId: community.id })
          .returning();

        const [auditLogs] = await db
          .insert(auditLogSchema)
          .values({
            communityId: community.id,
            actorId: userId,
            targetId: userId,
            action: "join",
            visibility: "public",
          })
          .returning();

        this.io
          .to(`community:${community.id}`)
          .emit("auditlogs:new", auditLogs);

        const [notification] = await NotificationService.joinedCommunity(
          userId,
          community.name
        );

        this.io.to(`user:${userId}`).emit("notification:new", notification);

        return socket.emit(
          "success-message",
          "Added your to community successfully"
        );

        // return res.status(201).json({
        //   status: "success",
        //   message: "Added member successfully",
        //   data: communityMemberShip,
        // });
      } else {
        const [joinRequest] = await db
          .insert(joinRequestSchema)
          .values({
            communityId: community.id,
            userId,
            status: "pending",
          })
          .returning();

        return socket.emit(
          "success-message",
          "Your join request is pending approval"
        );

        // return res.status(201).json({
        //   status: "success",
        //   message: "Your join request is pending approval",
        //   data: joinRequest,
        // });
      }
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async leaveMember(socket: Socket, data = { communityId: number }) {
    try {
      const userId = socket.data.user.id;

      if (!userId) {
        return socket.emit("error-message", "UnAuthentication");
      }

      const communityId = data.communityId;

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, Number(communityId)));

      if (!community) {
        return socket.emit("error-message", "Community not found");
        // return next(new ApiError("Community not found", 404));
      }

      if (community.createdBy === userId) {
        return socket.emit(
          "error-message",
          "Community owners cannot leave their community"
        );
        // return next(
        //   new ApiError("Community owners cannot leave their community", 400)
        // );
      }

      const [member] = await db
        .update(CommunityMemberShip)
        .set({ removedAt: new Date(), removedBy: null })
        .where(
          and(
            eq(CommunityMemberShip.userId, Number(userId)),
            eq(CommunityMemberShip.communityId, Number(communityId))
          )
        )
        .returning();

      const [auditLogs] = await db
        .insert(auditLogSchema)
        .values({
          communityId: community.id,
          actorId: userId,
          targetId: userId,
          action: "leave",
          visibility: "public",
        })
        .returning();

      socket.leave(`community:${community.id}`);

      socket.to(`community:${community.id}`).emit("auditlogs:new", auditLogs);

      socket.emit("success-message", "Successfully your leaved community");

      // res.status(200).json({
      //   status: "success",
      //   message: "Deleted member successfully",
      //   data: member,
      // });
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
