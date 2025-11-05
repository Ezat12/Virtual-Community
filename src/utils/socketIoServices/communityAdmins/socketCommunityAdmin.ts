import { Server, Socket } from "socket.io";
import { db } from "../../../db";
import {
  communitiesSchema as Community,
  communityAdminsSchema as CommunityAdmin,
} from "../../../schemas";
import { and, eq } from "drizzle-orm";
import z, { unknown, ZodError } from "zod";
import { HandlerError } from "../handlerError";
import { NotificationService } from "../../notificationService";
import { CommunityAdminsServices } from "./communityAdmin.services";

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

export class SocketCommunityAdmin extends HandlerError {
  constructor(private io: Server, private services: CommunityAdminsServices) {
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
      const perms = (permissions ?? []) as Permission[];

      const { notification } = await this.services.addAdmin(
        userId,
        communityId,
        userAdmin,
        perms
      );
      this.io
        .to(`user:${String(userAdmin)}`)
        .emit("notification:new", notification);

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
      const perms = (permissions ?? []) as Permission[];

      const { notification } = await this.services.updateMessage(
        userAdmin,
        userId,
        communityId,
        perms
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

      const { notification } = await this.services.deletedAdmin(
        userId,
        userAdmin,
        communityId
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
