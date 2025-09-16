import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import {
  communitiesSchema as Community,
  communityMembershipsSchema as CommunityMemberShips,
  messageCommunitySchema as MessageCommunity,
  usersSchema as User,
} from "../schemas";
import { and, eq, sql } from "drizzle-orm";
import { ApiFeatures } from "../utils/ApiFeatures";

// /messages-community/:communityId/send-message
export const addMessageCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const content = req.body?.content;
    const user = req.user;
    const community = req.community;

    const [sendMessage] = await db
      .insert(MessageCommunity)
      .values({
        senderId: user.id,
        communityId: community.id,
        content,
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Successfully sending message",
      data: sendMessage,
    });
  }
);

export const getMessageCommunityUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { communityId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [isMember] = await db
      .select()
      .from(CommunityMemberShips)
      .where(
        and(
          eq(CommunityMemberShips.userId, user.id),
          eq(CommunityMemberShips.communityId, community.id)
        )
      );

    if (!isMember) {
      return next(new ApiError("You are not a member in this community", 403));
    }

    const query = {
      ...req.query,
      userId: user.id.toString(),
      communityId: community.id.toString(),
    };

    const feature = new ApiFeatures(db, MessageCommunity, query, {
      id: MessageCommunity.id,
      content: MessageCommunity.content,
      isEdit: MessageCommunity.isEdited,
      createdAtMessage: MessageCommunity.createdAt,
      updatedAtMessage: MessageCommunity.updatedAt,
      deletedAtMessage: MessageCommunity.deletedAt,
      userName: User.name,
      userAvatar: User.avatarUrl,
      userEmail: User.email,
      userId: User.id,
      communityId: Community.id,
    })
      .filter()
      .sort()
      .paginate()
      .selectFields()
      .join(User, eq(MessageCommunity.senderId, User.id), "left")
      .join(Community, eq(Community.id, MessageCommunity.communityId), "left")
      .build();

    const messagesUser = await feature;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(MessageCommunity);

    res.status(200).json({
      status: "success",
      results: messagesUser.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: messagesUser,
    });
  }
);

export const getAllMessageCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { communityId } = req.params;
    const user = req.user;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [isMember] = await db
      .select()
      .from(CommunityMemberShips)
      .where(
        and(
          eq(CommunityMemberShips.userId, user.id),
          eq(CommunityMemberShips.communityId, community.id)
        )
      );

    if (!isMember) {
      return next(new ApiError("You are not a member in this community", 403));
    }

    const query = { ...req.query, communityId: community.id.toString() };

    const feature = new ApiFeatures(db, MessageCommunity, query, {
      id: MessageCommunity.id,
      content: MessageCommunity.content,
      isEdit: MessageCommunity.isEdited,
      createdAtMessage: MessageCommunity.createdAt,
      updatedAtMessage: MessageCommunity.updatedAt,
      deletedAtMessage: MessageCommunity.deletedAt,
      userName: User.name,
      userAvatar: User.avatarUrl,
      userEmail: User.email,
      userId: User.id,
      communityId: Community.id,
    })
      .filter()
      .sort()
      .paginate()
      .selectFields()
      .join(User, eq(MessageCommunity.senderId, User.id), "left")
      .join(Community, eq(Community.id, MessageCommunity.communityId), "left")
      .build();

    const messagesUser = await feature;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(MessageCommunity);

    res.status(200).json({
      status: "success",
      results: messagesUser.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: messagesUser,
    });
  }
);

export const updateMessageCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;

    const content = req.body?.content;

    const [updateMessage] = await db
      .update(MessageCommunity)
      .set(content ? { content, isEdited: true } : {})
      .where(eq(MessageCommunity.id, Number(messageId)))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Updated message successfully",
      data: updateMessage,
    });
  }
);

export const deleteMessageCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;

    const [deleteMessage] = await db
      .update(MessageCommunity)
      .set({ deletedAt: new Date() })
      .where(eq(MessageCommunity.id, Number(messageId)))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Deleted message successfully",
      data: deleteMessage,
    });
  }
);
