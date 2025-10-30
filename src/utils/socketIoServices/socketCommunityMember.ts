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
import { IsAdminToManageUsers } from "../../controllers/communityMembers.controller";

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

    socket.on("delete-member", (data) => {
      this.deleteMember(socket, data);
    });

    socket.on("handle-request", (data) => {
      this.handleJoinRequest(socket, data);
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

          this.io
            .to(`community-admin:${community.id}:users`)
            .emit("joinRequest:new", joinRequest);

          return socket.emit("success-message", {
            status: "success",
            message: "Your join request is pending approval",
            data: joinRequest,
          });

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

          return socket.emit("success-message", {
            status: "success",
            message: "Welcome back to the community",
            data: reactivated,
          });

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

          this.io
            .to(`community-admin:${community.id}:users`)
            .emit("joinRequest:new", joinRequest);

          return socket.emit("success-message", {
            status: "success",
            message: "Your join request is pending approval",
            data: joinRequest,
          });

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

        return socket.emit("success-message", {
          status: "success",
          message: "Added member successfully",
          data: communityMemberShip,
        });

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

        this.io
          .to(`community-admin:${community.id}:users`)
          .emit("joinRequest:new", joinRequest);

        return socket.emit("success-message", {
          status: "success",
          message: "Your join request is pending approval",
          data: joinRequest,
        });

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

      socket.emit("success-message", {
        status: "success",
        message: "Deleted member successfully",
        data: member,
      });

      // res.status(200).json({
      //   status: "success",
      //   message: "Deleted member successfully",
      //   data: member,
      // });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deleteMember(
    socket: Socket,
    data: { communityId: number; memberId: number }
  ) {
    try {
      const userId = socket.data.user.id;

      const { communityId, memberId } = data;

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, Number(communityId)));

      if (!communityId) {
        return socket.emit("error-message", "Community not found");
        // return next(new ApiError("Community not found", 404));
      }

      const [communityMemberShip] = await db
        .select()
        .from(CommunityMemberShip)
        .where(
          and(
            eq(CommunityMemberShip.userId, Number(memberId)),
            eq(CommunityMemberShip.communityId, community.id)
          )
        );

      if (!communityMemberShip) {
        return socket.emit(
          "error-message",
          "Not found member in this community"
        );
        // return next(new ApiError("Not found member in this community", 404));
      }

      const canManageUsers = await IsAdminToManageUsers(community.id, userId);
      if (!canManageUsers && community.createdBy !== userId) {
        return socket.emit(
          "error-message",
          "You are not authorized to access this route"
        );
        // return next(
        //   new ApiError("You are not authorized to access this route", 403)
        // );
      }

      if (Number(memberId) === userId) {
        return socket.emit("error-message", "Admins cannot remove themselves");
        // return next(new ApiError("Admins cannot remove themselves", 400));
      }

      const [member] = await db
        .update(CommunityMemberShip)
        .set({ removedAt: new Date(), removedBy: userId })
        .where(
          and(
            eq(CommunityMemberShip.userId, Number(memberId)),
            eq(CommunityMemberShip.communityId, Number(communityId))
          )
        )
        .returning();

      const [auditLogs] = await db
        .insert(auditLogSchema)
        .values({
          communityId: community.id,
          actorId: userId,
          targetId: member.id,
          action: "remove",
          visibility: "public",
        })
        .returning();

      socket.to(`community:${community.id}`).emit("auditlogs:new", auditLogs);

      socket.emit("success-message", {
        status: "success",
        message: "Remove member successfully",
        data: member,
      });

      // res.status(200).json({
      //   status: "success",
      //   message: "Remove member successfully",
      //   data: member,
      // });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async handleJoinRequest(
    socket: Socket,
    data: {
      communityId: number;
      requestId: number;
      action: "pending" | "accepted" | "rejected" | null | undefined;
    }
  ) {
    try {
      const user = socket.data.user;

      const { communityId, requestId } = data;
      const { action } = data;

      if (!action) {
        return socket.emit("error-message", "Action must be required");
        // return next(new ApiError("Action must be required", 400));
      }

      if (!["accepted", "rejected"].includes(action)) {
        return socket.emit("error-message", "Invalid action");
        // return next(new ApiError("Invalid action", 400));
      }

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, Number(communityId)));

      if (!community) {
        return socket.emit("error-message", "Community not found");
        // return next(new ApiError("Community not found", 404));
      }

      const canManageUsers = await IsAdminToManageUsers(community.id, user.id);
      if (!canManageUsers && community.createdBy !== user.id) {
        return socket.emit(
          "error-message",
          "You are not authorized to access this route"
        );
        // return next(
        //   new ApiError("You are not authorized to access this route", 403)
        // );
      }

      const [requestMember] = await db
        .select()
        .from(joinRequestSchema)
        .where(eq(joinRequestSchema.id, Number(requestId)));

      if (!requestMember) {
        return socket.emit("error-message", "Request not found");
        // return next(new ApiError("Request not found", 404));
      }
      const [existingMember] = await db
        .select()
        .from(CommunityMemberShip)
        .where(
          and(
            eq(CommunityMemberShip.userId, Number(requestMember.userId)),
            eq(CommunityMemberShip.communityId, community.id)
          )
        );

      if (existingMember) {
        return socket.emit(
          "error-message",
          "User is already a member of the community"
        );
        // return next(
        //   new ApiError("User is already a member of the community", 400)
        // );
      }
      const [request] = await db
        .update(joinRequestSchema)
        .set({ status: action })
        .where(
          and(
            eq(joinRequestSchema.communityId, community.id),
            eq(joinRequestSchema.id, Number(requestId))
          )
        )
        .returning();

      if (!request) {
        return socket.emit("error-message", "Join request not found");
        // return next(new ApiError("Join request not found", 404));
      }

      if (action === "accepted") {
        await db.insert(CommunityMemberShip).values({
          userId: request.userId,
          communityId: community.id,
        });

        const [auditLogs] = await db
          .insert(auditLogSchema)
          .values({
            communityId: community.id,
            actorId: user.id,
            targetId: request.userId,
            action: "accept",
            visibility: "public",
          })
          .returning();

        this.io
          .to(`community:${community.id}`)
          .emit("auditlogs:new", auditLogs);

        if (requestMember.userId) {
          const [notification] = await NotificationService.joinedCommunity(
            requestMember.userId,
            community.name
          );

          this.io
            .to(`user:${requestMember.userId}`)
            .emit("notification:new", notification);
        }
      } else {
        await db.insert(auditLogSchema).values({
          communityId: community.id,
          actorId: user.id,
          targetId: request.userId,
          action: "reject",
          visibility: "private",
        });

        const [notification] = await NotificationService.rejectedCommunity(
          requestMember.userId as number,
          community.name
        );

        this.io
          .to(`user:${requestMember.userId}`)
          .emit("notification:new", notification);
      }

      await db
        .delete(joinRequestSchema)
        .where(eq(joinRequestSchema.id, Number(requestId)));

      socket.emit("success-message", { status: "success", data: request });
    } catch (e) {
      this.handleError(socket, e);
    }

    // res.status(200).json({ status: "success", data: request });
  }
}
