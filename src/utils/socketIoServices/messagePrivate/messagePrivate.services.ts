import { ApiError } from "../../apiError";
import {
  CanDelete,
  CanSend,
  CanUpdate,
  IsRead,
  MessagePrivateAuthorization,
} from "./messagePrivate.auth";
import { MessagePrivateRepository } from "./messagePrivate.repository";

export class MessagePrivateServices {
  constructor(private repo: MessagePrivateRepository) {}

  async sendMessage(receiverId: number, senderId: number, content: string) {
    const user = await this.repo.findUserById(receiverId);
    if (!user) {
      throw new ApiError("User not found to receiver this message", 404);
    }

    const canSend = new CanSend();
    const messagePrivateAuth = new MessagePrivateAuthorization([canSend]);
    const check = messagePrivateAuth.check({ receiverId, senderId });

    if (!check.ok) {
      throw new ApiError(check.error || "Forbidden", check.code || 500);
    }

    const message = await this.repo.create(senderId, receiverId, content);

    return message;
  }

  async updateMessage(messageId: number, userId: number, content: string) {
    const message = await this.repo.findMessageById(messageId);
    if (!message) {
      throw new ApiError("Message not found", 404);
    }

    const canUpdate = new CanUpdate();
    const isRead = new IsRead();

    const messagePrivateAuth = new MessagePrivateAuthorization([
      canUpdate,
      isRead,
    ]);

    const check = messagePrivateAuth.check({
      senderId: message.senderId,
      userId,
      isRead: message.isRead,
    });

    if (!check.ok) {
      throw new ApiError(check.error || "Forbidden", check.code || 500);
    }

    const updateMessage = await this.repo.update(message.id, content);

    return updateMessage;
  }

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.repo.findMessageById(messageId);
    if (!message) {
      throw new ApiError("Message not found", 404);
    }

    const canDelete = new CanDelete();
    const messagePrivateAuth = new MessagePrivateAuthorization([canDelete]);

    const check = messagePrivateAuth.check({
      senderId: message.senderId,
      userId,
    });

    if (!check.ok) {
      throw new ApiError(check.error || "Forbidden", check.code || 500);
    }

    const deleteMessage = await this.repo.deleteMessage(message.id);

    return deleteMessage;
  }
}
