import { Server, Socket } from "socket.io";
import {
  communitiesSchema,
  communityAdminsSchema,
  communityMembershipsSchema,
  messageCommunitySchema as MessageCommunity,
  messageCommunitySchema,
} from "../../schemas";
import { db } from "../../db";
import {
  sendMessageToCommunityValidation,
  updateMessageToCommunityValidation,
} from "../../validations/messageCommunity.validation";
import { and, eq, sql } from "drizzle-orm";
import { ZodError } from "zod";
import { HandlerError } from "./handlerError";

export class SocketMessageCommunity extends HandlerError {
  constructor(private io: Server) {
    super();
  }

  MessageCommunityHandler(socket: Socket) {
    socket.on("send-community-message", (data) =>
      this.sendMessageCommunity(socket, data)
    );

    socket.on("update-community-message", (data) =>
      this.updateMessageCommunity(socket, data)
    );

    socket.on("delete-community-message", (data) =>
      this.deleteMessageCommunity(socket, data)
    );
  }

  private async sendMessageCommunity(
    socket: Socket,
    data: {
      communityId: number;
      senderId: number;
      content: string;
    }
  ) {
    try {
      await sendMessageToCommunityValidation.parseAsync(data);
      const { communityId, senderId, content } = data;

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, Number(communityId)));

      if (!community) {
        return socket.emit("error-message", "Community not found");
      }

      const [isMember] = await db
        .select()
        .from(communityMembershipsSchema)
        .where(
          and(
            eq(communityMembershipsSchema.userId, senderId),
            eq(communityMembershipsSchema.communityId, community.id)
          )
        );

      if (!isMember) {
        return socket.emit(
          "error-message",
          "You are not a member in this community"
        );
      }
      const [newMessage] = await db
        .insert(MessageCommunity)
        .values({
          communityId,
          senderId,
          content,
        })
        .returning();

      this.io
        .to(`community:${communityId.toString()}`)
        .emit("receive-community-message", newMessage);
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  private async updateMessageCommunity(
    socket: Socket,
    data: { messageId: number; content: string; userId: number }
  ) {
    try {
      const { messageId, content, userId } = data;
      await updateMessageToCommunityValidation.parseAsync(data);

      const [message] = await db
        .select()
        .from(messageCommunitySchema)
        .where(eq(messageCommunitySchema.id, messageId));

      if (!message) {
        socket.emit("error-message", "Message not found");
      }

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, message.communityId));

      if (!community) {
        return socket.emit("error-message", "Community not found");
      }

      if (userId !== message.senderId) {
        return socket.emit(
          "error-message",
          "You are not allowed to update the message"
        );
      }

      const [updated] = await db
        .update(messageCommunitySchema)
        .set({ content, isEdited: true })
        .where(eq(messageCommunitySchema.id, messageId))
        .returning();

      if (!updated) {
        return socket.emit("error-message", "Message not found");
      }

      this.io
        .to(`community:${updated.communityId.toString()}`)
        .emit("update-message-community", updated);
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  private async deleteMessageCommunity(
    socket: Socket,
    data: { messageId: number; userId: number }
  ) {
    try {
      const { messageId, userId } = data;

      const [message] = await db
        .select()
        .from(messageCommunitySchema)
        .where(eq(messageCommunitySchema.id, Number(messageId)));

      if (!message) {
        return socket.emit("error-message", "Message not found");
      }

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, message.communityId));

      if (!community) {
        return socket.emit("error-message", "Community not found");
      }

      const [isAdmin] = await db
        .select()
        .from(communityAdminsSchema)
        .where(
          and(
            eq(communityAdminsSchema.userId, userId),
            eq(communityAdminsSchema.communityId, community.id),
            sql`${communityAdminsSchema.permissions} && ARRAY['manage_users','edit_settings','manage_posts']::permissions[]`
          )
        );

      if (
        userId !== message.senderId &&
        userId !== community.createdBy &&
        !isAdmin
      ) {
        return socket.emit(
          "error-message",
          "You are not allowed to delete the message"
        );
      }

      const [deleteMessage] = await db
        .update(MessageCommunity)
        .set({ deletedAt: new Date() })
        .where(eq(MessageCommunity.id, messageId))
        .returning();

      socket.emit("delete-message-community", deleteMessage);
    } catch (error) {
      this.handleError(socket, error);
    }
  }
}
