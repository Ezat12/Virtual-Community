import { Server, Socket } from "socket.io";
import { number, ZodError } from "zod";
import {
  sendMessagePrivateValidation,
  updateMessagePrivateValidation,
} from "../../validations/messagePrivate.validation";
import { db } from "../../db";
import { messagePrivateSchema, usersSchema } from "../../schemas";
import { eq } from "drizzle-orm";
import { HandlerError } from "./handlerError";

export class SocketMessagePrivate extends HandlerError {
  constructor(private io: Server) {
    super();
  }

  messagePrivateHandler(socket: Socket) {
    socket.on("send-message", (data) => this.sendMessagePrivate(socket, data));
    socket.on("update-message", (data) =>
      this.updateMessagePrivate(socket, data)
    );

    socket.on("delete-message", (data) => this.deleteMessage(socket, data));
  }

  private async sendMessagePrivate(
    socket: Socket,
    data: { receiverId: number; senderId: number; content: string }
  ) {
    const { receiverId, senderId, content } = data;
    try {
      await sendMessagePrivateValidation.parseAsync(data);

      if (receiverId === senderId) {
        socket.emit("error-message", "Cannot send message to yourself");
      }

      const [user] = await db
        .select()
        .from(usersSchema)
        .where(eq(usersSchema.id, receiverId));

      if (!user) {
        socket.emit("error-message", "User not found to receiver this message");
      }

      const [message] = await db
        .insert(messagePrivateSchema)
        .values({ senderId, receiverId, content })
        .returning();

      socket.emit("send-message", message);
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  private async updateMessagePrivate(
    socket: Socket,
    data: { messageId: number; content: string; userId: number }
  ) {
    try {
      const { messageId, content, userId } = data;
      await updateMessagePrivateValidation.parseAsync(data);

      // const messageId = Number(req.params.messageId);

      const [message] = await db
        .select()
        .from(messagePrivateSchema)
        .where(eq(messagePrivateSchema.id, messageId));

      if (!message) {
        socket.emit("error-message", "Message not found");
      }

      if (message.senderId !== userId) {
        socket.emit(
          "error-message",
          "You are not allowed to update this message"
        );
      }
      if (message.isRead) {
        socket.emit(
          "error-message",
          "You cannot edit this message because it has already been read"
        );
      }
      const [updateMessage] = await db
        .update(messagePrivateSchema)
        .set({ content })
        .where(eq(messagePrivateSchema.id, messageId))
        .returning();

      socket.emit("update-message", updateMessage);
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deleteMessage(
    socket: Socket,
    data: { messageId: number; userId: number }
  ) {
    try {
      const { messageId, userId } = data;

      const [message] = await db
        .select()
        .from(messagePrivateSchema)
        .where(eq(messagePrivateSchema.id, messageId));

      if (!message) {
        socket.emit("error-message", "Message not found");
      }

      if (message.senderId !== userId) {
        socket.emit("error-message", "Message not found");
      }

      const [deleteMessage] = await db
        .update(messagePrivateSchema)
        .set({ deletedAt: new Date() })
        .where(eq(messagePrivateSchema.id, Number(messageId)))
        .returning();

      socket.emit("delete-message", deleteMessage);
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
