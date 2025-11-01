import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  communitiesSchema,
  communityAdminsSchema,
  communityMembershipsSchema,
  messageCommunitySchema,
} from "../../../schemas";

export class AuthorizationMessageCommunityServices {
  public async canSendMessage(senderId: number, communityId: number) {
    const [isMember] = await db
      .select()
      .from(communityMembershipsSchema)
      .where(
        and(
          eq(communityMembershipsSchema.userId, senderId),
          eq(communityMembershipsSchema.communityId, communityId)
        )
      );

    // if (!isMember) {
    //   throw new ApiError("You are not a member in this community", 403);
    // }

    return !isMember ? false : true;
  }
  public async canUpdateMessage(userId: number, senderId: number) {
    // if (userId !== senderId) {
    //   throw new ApiError("You are not allowed to update the message", 403);
    // }

    return userId === senderId;
  }
  public async canDeleteMessage(userId: number, community: any, message: any) {
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

    // if (
    //   userId !== message.senderId &&
    //   userId !== community.createdBy &&
    //   !isAdmin
    // ) {
    //   throw new ApiError("You are not allowed to delete the message", 403);
    // }

    return userId !== message.senderId &&
      userId !== community.createdBy &&
      !isAdmin
      ? false
      : true;
  }
}

export class MessageCommunityRepository {
  public async create(communityId: number, senderId: number, content: string) {
    const [newMessage] = await db
      .insert(messageCommunitySchema)
      .values({
        communityId,
        senderId,
        content,
      })
      .returning();

    return newMessage;
  }

  public async findByIdCommunity(communityId: number) {
    const [community] = await db
      .select()
      .from(communitiesSchema)
      .where(eq(communitiesSchema.id, Number(communityId)));

    return community || null;
  }

  public async findByIdMessage(messageId: number) {
    const [message] = await db
      .select()
      .from(messageCommunitySchema)
      .where(eq(messageCommunitySchema.id, Number(messageId)));

    return message || null;
  }

  public async update(content: string, messageId: number) {
    const [updated] = await db
      .update(messageCommunitySchema)
      .set({ content, isEdited: true })
      .where(eq(messageCommunitySchema.id, messageId))
      .returning();

    return updated || null;
  }

  public async softDeleteMessage(messageId: number) {
    const [deleteMessage] = await db
      .update(messageCommunitySchema)
      .set({ deletedAt: new Date() })
      .where(eq(messageCommunitySchema.id, messageId))
      .returning();

    return deleteMessage || null;
  }
}
