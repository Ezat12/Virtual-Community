import expressAsyncHandler from "express-async-handler";
import { db } from "../db";
import {
  notificationSchema as Notification,
  usersSchema as User,
} from "../schemas";
import { Request, Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { ApiFeatures } from "../utils/ApiFeatures";

export enum TypeNotifications {
  JoinCommunity = "join_community",
  RejectCommunity = "reject_community",
  YourAdmin = "your_admin",
  RemoveAdmin = "remove_admin",
  UpdateAdmin = "update_admin",
  Like = "like",
  LikeComment = "like_comment",
  // AcceptPost = "accept_post",
  // RejectPost = "reject_post",
  Comment = "comment",
  Mention = "mention",
}

export const addNotification = async (
  userId: number,
  message: string,
  type: TypeNotifications,
  isRead = false
) => {
  return await db
    .insert(Notification)
    .values({ userId, message, type, isRead })
    .returning();
};

export const readNotification = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;

    const [notification] = await db
      .select()
      .from(Notification)
      .where(eq(Notification.id, Number(notificationId)));

    if (!notification) {
      return next(new ApiError("Notification not found", 404));
    }

    const [updateNotification] = await db
      .update(Notification)
      .set({ isRead: true })
      .where(eq(Notification.id, notification.id))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Updated successfully",
      data: updateNotification,
    });
  }
);

export const readAllNotificationUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const notifications = await db
      .update(Notification)
      .set({ isRead: true })
      .where(eq(Notification.userId, user.id))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Updated all successfully",
      data: notifications,
    });
  }
);

export const getAllNotificationUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const query = {
      ...req.query,
      userId: user.id.toString(),
      sort: req.query.sort || "-createdAt",
    };

    const features = new ApiFeatures(db, Notification, query, {
      notificationId: Notification.id,
      userId: User.id,
      message: Notification.message,
      isRead: Notification.isRead,
      type: Notification.type,
      createdAt: Notification.createdAt,
    });

    const finalQuery = features
      .filter()
      .join(User, eq(User.id, Notification.userId), "left")
      .sort()
      .selectFields()
      .paginate()
      .build();

    const result = await finalQuery;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Notification)
      .where(eq(Notification.userId, user.id));

    res.status(200).json({
      status: "success",
      results: result.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: result,
    });
  }
);
