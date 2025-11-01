import { Server, Socket } from "socket.io";
import {
  sendMessageToCommunityValidation,
  updateMessageToCommunityValidation,
} from "../../../validations/messageCommunity.validation";
import { HandlerError } from "../handlerError";
import { CommunityMessageServices } from "./communityMessage.services";

export class SocketMessageCommunity extends HandlerError {
  constructor(
    private io: Server,
    private CMServices: CommunityMessageServices
  ) {
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
      content: string;
    }
  ) {
    try {
      await sendMessageToCommunityValidation.parseAsync(data);
      const { communityId, content } = data;

      const newMessage = await this.CMServices.sendMessage(
        communityId,
        socket.data.user.id,
        content
      );

      this.io
        .to(`community:${communityId.toString()}`)
        .emit("receive-community-message", newMessage);
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  private async updateMessageCommunity(
    socket: Socket,
    data: { messageId: number; content: string }
  ) {
    try {
      const { messageId, content } = data;
      await updateMessageToCommunityValidation.parseAsync(data);

      const updateMessage = await this.CMServices.updateMessage(
        messageId,
        content,
        socket.data.user.id
      );

      this.io
        .to(`community:${updateMessage.communityId.toString()}`)
        .emit("update-message-community", updateMessage);
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  private async deleteMessageCommunity(
    socket: Socket,
    data: { messageId: number }
  ) {
    try {
      const { messageId } = data;
      const deleteMessage = await this.CMServices.deleteMessage(
        messageId,
        socket.data.user.id
      );
      this.io
        .to(`community:${deleteMessage.communityId.toString()}`)
        .emit("delete-message-community", deleteMessage);
    } catch (error) {
      this.handleError(socket, error);
    }
  }
}
