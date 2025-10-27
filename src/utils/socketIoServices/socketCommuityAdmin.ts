import { Server, Socket } from "socket.io";
import { db } from "../../db";
import {
  communitiesSchema as Community,
  communityAdminsSchema as CommunityAdmin,
} from "../../schemas";
import { and, eq } from "drizzle-orm";
import z, { unknown, ZodError } from "zod";
import { HandlerError } from "./handlerError";
import { NotificationService } from "../notificationService";

export const PERMISSIONS = [
  "manage_users",
  "edit_settings",
  "manage_posts",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const adminSchema = z.object({
  communityId: z.number().int().positive(),
  userAdmin: z.number().int().positive(),
  permissions: z
    .array(z.enum([...PERMISSIONS] as [string, ...string[]]))
    .optional(),
});

function normalizePermissions(input?: unknown): Permission[] {
  if (!input) return ["manage_posts"];
  if (!Array.isArray(input)) return ["manage_posts"];
  const result: Permission[] = [];
  for (const p of input) {
    if (
      typeof p === "string" &&
      (PERMISSIONS as readonly string[]).includes(p)
    ) {
      result.push(p as Permission);
    }
  }
  return result.length ? result : ["manage_posts"];
}

class SocketCommunityAdmin extends HandlerError {
  constructor(private io: Server) {
    super();
  }

  CommunityAdminHandler(socket: Socket) {
    socket.on("add-admin", (data) => {
      this.addAdmin(socket, data);
    });

    socket.on("update-admin", (data) => {
      this.updateAdmin(socket, data);
    });

    socket.on("delete-admin", (data) => {
      this.deleteAdmin(socket, data);
    });
  }

  private async addAdmin(socket: Socket, data: unknown) {
    try {
      const parsed = adminSchema.parse(data);
      const { communityId, userAdmin, permissions } = parsed;
      const userId = socket.data.user.id;

      if (!userId) {
        return socket.emit("error-message", "UnAuthentication");
      }

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, communityId));

      if (!community) {
        return socket.emit("error-message", "community not found");
        // return next(new ApiError("Community not found", 404));
      }

      const [existAdmin] = await db
        .select()
        .from(CommunityAdmin)
        .where(
          and(
            eq(CommunityAdmin.communityId, communityId),
            eq(CommunityAdmin.userId, userAdmin)
          )
        );

      if (existAdmin) {
        return socket.emit("error-message", "User is already an admin");
        // return next(new ApiError("User is already an admin", 400));
      }

      const admins = await db
        .select()
        .from(CommunityAdmin)
        .where(eq(CommunityAdmin.communityId, community.id));

      const checkUserIsAllowed = admins.some(
        (admin) =>
          admin.userId === userId && admin.permissions.includes("manage_users")
      );

      if (community.createdBy !== userId && !checkUserIsAllowed) {
        return socket.emit(
          "error-message",
          "You are not authorized to add admins"
        );
        // return next(new ApiError("You are not authorized to add admins", 403));
      }

      const perms = normalizePermissions(permissions) as Permission[];

      const [communityAdmin] = await db
        .insert(CommunityAdmin)
        .values({
          communityId,
          userId: userAdmin,
          permissions: perms,
        })
        .returning();
      const notification = await NotificationService.promotedToAdmin(
        userAdmin,
        community.name
      );

      this.io
        .to(`user:${String(userAdmin)}`)
        .emit("notification:new", notification[0]);

      socket.emit("success-message", "Admin added successfully");
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async updateAdmin(socket: Socket, data = unknown) {
    try {
      const parsed = adminSchema.parse(data);
      const { userAdmin, communityId, permissions } = parsed;
      const userId = socket.data.user.id;

      if (!userId) {
        return socket.emit("error-message", "UnAuthentication");
      }

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, communityId));

      if (!community) {
        return socket.emit("error-message", "Community not found");
        // return next(new ApiError("Community not found", 404));
      }

      const [existAdmin] = await db
        .select()
        .from(CommunityAdmin)
        .where(
          and(
            eq(CommunityAdmin.communityId, communityId),
            eq(CommunityAdmin.userId, userAdmin)
          )
        );

      if (!existAdmin) {
        return socket.emit(
          "error-message",
          "This user is not an admin in this community"
        );
        // return next(
        //   new ApiError("This user is not an admin in this community", 400)
        // );
      }

      const admins = await db
        .select()
        .from(CommunityAdmin)
        .where(eq(CommunityAdmin.communityId, community.id));

      const checkUserIsAllowed = admins.some(
        (admin) =>
          admin.userId === userId && admin.permissions.includes("manage_users")
      );

      if (community.createdBy !== userId && !checkUserIsAllowed) {
        return socket.emit(
          "error-message",
          "You are not authorized to update admins"
        );
        // return next(
        // new ApiError("You are not authorized to update admins", 403)
        // );
      }

      const perms = normalizePermissions(permissions);

      const [adminCommunity] = await db
        .update(CommunityAdmin)
        .set({ permissions: perms })
        .where(
          and(
            eq(CommunityAdmin.communityId, communityId),
            eq(CommunityAdmin.userId, userAdmin)
          )
        )
        .returning();

      const [notification] = await NotificationService.updatedAdminPermissions(
        userAdmin,
        community.name
      );

      this.io
        .to(`user:${String(userAdmin)}`)
        .emit("notification:new", notification);

      socket.emit("success-message", "Admin updated successfully");
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deleteAdmin(socket: Socket, data = unknown) {
    try {
      const parsed = adminSchema.parse(data);

      const { userAdmin, communityId } = parsed;

      const userId = socket.data.user.id;

      if (!userId) {
        return socket.emit("error-message", "UnAuthentication");
      }

      const [community] = await db
        .select()
        .from(Community)
        .where(eq(Community.id, communityId));

      if (!community) {
        return socket.emit("error-message", "Community not found");
        // return next(new ApiError("Community not found", 404));
      }

      const admins = await db
        .select()
        .from(CommunityAdmin)
        .where(eq(CommunityAdmin.communityId, community.id));

      const checkUserIsAllowed = admins.some(
        (admin) =>
          admin.userId === userId && admin.permissions.includes("manage_users")
      );

      if (community.createdBy !== userId && !checkUserIsAllowed) {
        return socket.emit(
          "error-message",
          "You are not authorized to delete admins"
        );
        // return next(new ApiError("You are not authorized to delete admins", 403));
      }

      await db
        .delete(CommunityAdmin)
        .where(
          and(
            eq(CommunityAdmin.userId, userAdmin),
            eq(CommunityAdmin.communityId, communityId)
          )
        );

      const [notification] = await NotificationService.demotedFromAdmin(
        userAdmin,
        community.name
      );

      this.io
        .to(`user:${String(userAdmin)}`)
        .emit("notification:new", notification);

      socket.emit("success-message", "Deleted admin successfully");
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
