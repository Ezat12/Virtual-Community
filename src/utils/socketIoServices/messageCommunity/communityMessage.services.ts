import { ApiError } from "../../apiError";
import {
  AuthorizationMessageCommunityServices,
  MessageCommunityRepository,
} from "./communityMessages.repository";

export class CommunityMessageServices {
  constructor(
    private repo: MessageCommunityRepository,
    private auth: AuthorizationMessageCommunityServices
  ) {}

  public async sendMessage(
    communityId: number,
    senderId: number,
    content: string
  ) {
    const community = await this.repo.findByIdCommunity(communityId);
    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const canSend = await this.auth.canSendMessage(senderId, community.id);
    if (!canSend) {
      throw new ApiError("You are not a member in this community", 403);
    }

    const newMessage = await this.repo.create(community.id, senderId, content);
    return newMessage;
  }

  public async updateMessage(
    messageId: number,
    content: string,
    userId: number
  ) {
    const message = await this.repo.findByIdMessage(messageId);
    if (!message) {
      throw new ApiError("Community not found", 404);
    }
    const community = await this.repo.findByIdCommunity(message.communityId);
    if (!community) {
      throw new ApiError("Message not found", 404);
    }

    const canUpdate = await this.auth.canUpdateMessage(
      userId,
      message.senderId
    );
    if (!canUpdate) {
      throw new ApiError("You are not allowed to update the message", 403);
    }

    const updateMessage = await this.repo.update(content, message.id);
    return updateMessage;
  }

  public async deleteMessage(messageId: number, userId: number) {
    const message = await this.repo.findByIdMessage(messageId);
    if (!message) {
      throw new ApiError("Community not found", 404);
    }
    const community = await this.repo.findByIdCommunity(message.communityId);
    if (!community) {
      throw new ApiError("Message not found", 404);
    }

    const canDelete = await this.auth.canDeleteMessage(
      userId,
      community,
      message
    );
    if (!canDelete) {
      throw new ApiError("You are not allowed to delete the message", 403);
    }

    const deleted = await this.repo.softDeleteMessage(message.id);
    return deleted;
  }
}
