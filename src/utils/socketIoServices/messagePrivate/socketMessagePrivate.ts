import { Server, Socket } from "socket.io";
import {
  sendMessagePrivateValidation,
  updateMessagePrivateValidation,
} from "../../../validations/messagePrivate.validation";
import { HandlerError } from "../handlerError";
import { MessagePrivateServices } from "./messagePrivate.services";

export class SocketMessagePrivate extends HandlerError {
  constructor(private io: Server, private MPServices: MessagePrivateServices) {
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
    data: { receiverId: number; content: string }
  ) {
    const { receiverId, content } = data;
    const senderId = socket.data.user.id;
    try {
      await sendMessagePrivateValidation.parseAsync(data);

      const message = await this.MPServices.sendMessage(
        receiverId,
        senderId,
        content
      );

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
      const { messageId, content } = data;
      const userId = socket.data.user.id;
      await updateMessagePrivateValidation.parseAsync(data);

      const updateMessage = await this.MPServices.updateMessage(
        messageId,
        userId,
        content
      );
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

      const deleteMessage = await this.MPServices.deleteMessage(
        messageId,
        userId
      );

      socket.emit("delete-message", deleteMessage);
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
