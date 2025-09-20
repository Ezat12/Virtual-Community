import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { messagePrivateSchema as MessagePrivate } from "../schemas/messagePrivate";
import expressAsyncHandler from "express-async-handler";
import { and, desc, eq, max, or, sql } from "drizzle-orm";
import { usersSchema as User } from "../schemas";

export const sendPrivateMessage = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    const [message] = await db
      .insert(MessagePrivate)
      .values({ senderId, receiverId, content })
      .returning();

    res.status(201).json({ status: "success", data: message });
  }
);

export const getConversationBetweenUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const myId = req.user.id;
    const otherId = Number(req.params.userId);

    const messages = await db
      .select({
        messageId: MessagePrivate.id,
        content: MessagePrivate.content,
        isRead: MessagePrivate.isRead,
        createdAt: MessagePrivate.createdAt,
        updatedAt: MessagePrivate.updatedAt,
        deletedAt: MessagePrivate.deletedAt,
        senderId: User.id,
        receiverId: MessagePrivate.receiverId,
        receiverName: User.name,
        receiverEmail: User.email,
        receiverAvatar: User.avatarUrl,
      })
      .from(MessagePrivate)
      .where(
        or(
          and(
            eq(MessagePrivate.senderId, myId),
            eq(MessagePrivate.receiverId, otherId)
          ),
          and(
            eq(MessagePrivate.senderId, otherId),
            eq(MessagePrivate.receiverId, myId)
          )
        )
      )
      .leftJoin(User, eq(User.id, MessagePrivate.receiverId))
      .orderBy(MessagePrivate.createdAt);

    res.status(200).json({
      status: "success",
      data: messages,
    });
  }
);

export const getUserConversations = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const lastMessages = await db.execute(sql`
      SELECT DISTINCT ON (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at
      FROM message_private
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
      ORDER BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `);

    const unreadCounts = await db.execute(sql`
      SELECT
        CASE
          WHEN sender_id = ${userId} THEN receiver_id
          ELSE sender_id
        END AS other_user_id,
        COUNT(*) AS unread
      FROM message_private
      WHERE receiver_id = ${userId}
        AND is_read = false
      GROUP BY other_user_id;
    `);

    const conversations = await Promise.all(
      lastMessages.rows.map(async (msg) => {
        const otherUserId =
          msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

        const otherUser = await db
          .select({
            id: User.id,
            name: User.name,
            avatarUrl: User.avatarUrl,
            email: User.email,
          })
          .from(User)
          .where(sql`${User.id} = ${otherUserId}`);

        const unread =
          unreadCounts.rows.find(
            (u) => Number(u.other_user_id) === Number(otherUserId)
          )?.unread || 0;

        return {
          otherUserId,
          otherUserName: otherUser[0]?.name || "Unknown",
          otherUserAvatar: otherUser[0]?.avatarUrl,
          otherUserEmail: otherUser[0]?.email,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            isRead: msg.is_read,
            createdAt: msg.created_at,
          },
          unreadCount: Number(unread),
        };
      })
    );

    const totalResult = await db.execute(
      sql`
    SELECT COUNT(
      DISTINCT LEAST(sender_id, receiver_id)
        || '-' ||
        GREATEST(sender_id, receiver_id)
    ) AS total
    FROM message_private
    WHERE sender_id = ${userId}
      OR receiver_id = ${userId};
  `
    );

    const total = Number(totalResult.rows[0]?.total ?? 0);

    const unreadResult = await db.execute(
      sql`
    SELECT COUNT(*) AS total_unread
    FROM message_private
    WHERE receiver_id = ${userId}
      AND is_read = false;
  `
    );

    const totalUnread = Number(unreadResult.rows[0]?.total_unread ?? 0);

    res.status(200).json({
      status: "success",
      data: conversations,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
      summary: { totalUnread: Number(totalUnread) },
    });
  }
);

export const readAllMessage = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const { senderId } = req.params;

    const updateRead = await db
      .update(MessagePrivate)
      .set({ isRead: true })
      .where(
        and(
          eq(MessagePrivate.senderId, Number(senderId)),
          eq(MessagePrivate.receiverId, user.id)
        )
      )
      .returning();

    res.status(200).json({
      status: "success",
      message: "Successfully read all messages",
      data: updateRead,
    });
  }
);

export const updateMessage = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;

    const { content } = req.body;

    const [updateMessage] = await db
      .update(MessagePrivate)
      .set({ content })
      .where(eq(MessagePrivate.id, Number(messageId)))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Updated message successfully",
      data: updateMessage,
    });
  }
);

export const deleteMessage = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;

    const [deleteMessage] = await db
      .update(MessagePrivate)
      .set({ deletedAt: new Date() })
      .where(eq(MessagePrivate.id, Number(messageId)))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Deleted message successfully",
      data: deleteMessage,
    });
  }
);
