import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../db";
import { postsSchema, usersSchema as User } from "../schemas";
import { and, eq, or, sql } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { commentsSchema as Comment } from "../schemas/comments";
import { ApiFeatures } from "../utils/ApiFeatures";
import { NotificationService } from "../utils/notificationService";

export const addComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { postId } = req.params;
    const content = req.body.content;

    const [comment] = await db
      .insert(Comment)
      .values({
        postId: Number(postId),
        userId: user.id,
        content,
      })
      .returning();

    await NotificationService.commentedPost(user.id, user.name);

    res.status(201).json({ status: "success", data: comment });
  }
);

export const getCommentsByPost = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;

    const [post] = await db
      .select()
      .from(postsSchema)
      .where(eq(postsSchema.id, Number(postId)));

    if (!post) {
      return next(new ApiError("Post not found", 404));
    }

    const query = { ...req.query, postId: post.id.toString() };

    const features = new ApiFeatures(db, Comment, query, {
      commentId: Comment.id,
      postId: Comment.postId,
      content: Comment.content,
      likesCount: Comment.likesCount,
      userId: User.id,
      userName: User.name,
      userEmail: User.email,
      userAvatar: User.avatarUrl,
      createdAt: Comment.createdAt,
    })
      .filter()
      .sort()
      .paginate()
      .selectFields()
      .join(User, eq(Comment.userId, User.id), "left")
      .build();

    const comments = await features;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Comment);

    res.status(200).json({
      status: "success",
      results: comments.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: comments,
    });
  }
);

export const getCommentById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = req.params;

    const [comment] = await db
      .select({
        id: Comment.id,
        postId: Comment.postId,
        userId: Comment.userId,
        content: Comment.content,
        likesCount: Comment.likesCount,
        referenceId: Comment.referenceId,
        createdAt: Comment.createdAt,
        updatedAt: Comment.updatedAt,
        userName: User.name,
        userAvatar: User.avatarUrl,
        userEmail: User.email,
      })
      .from(Comment)
      .where(
        or(
          eq(Comment.id, Number(commentId)),
          eq(Comment.referenceId, Number(commentId))
        )
      )
      .leftJoin(User, eq(Comment.userId, User.id));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    res.status(200).json({ status: "success", data: comment });
  }
);

export const updateComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    const { commentId } = req.params;
    const user = req.user;

    const [comment] = await db
      .select()
      .from(Comment)
      .where(eq(Comment.id, Number(commentId)));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    if (comment.userId !== user.id) {
      return next(
        new ApiError("You are not authorized to update comment", 403)
      );
    }

    const [updateComment] = await db
      .update(Comment)
      .set({ content })
      .where(eq(Comment.id, comment.id))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Update comment successfully",
      date: updateComment,
    });
  }
);

export const deleteComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = req.params;

    const [deletedComment] = await db
      .delete(Comment)
      .where(eq(Comment.id, Number(commentId)))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Delete comment successfully",
      data: deletedComment,
    });
  }
);

export const addCommentReferences = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { commentId } = req.params;
    const content = req.body.content;

    const [comment] = await db
      .select()
      .from(Comment)
      .where(eq(Comment.id, Number(commentId)));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    const [addCommentRef] = await db
      .insert(Comment)
      .values({
        postId: comment.postId,
        userId: user.id,
        referenceId: comment.id,
        content,
      })
      .returning();

    res.status(201).json({ status: "success", data: addCommentRef });
  }
);

export const getCommentsReferencesToComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // const user = req.user;
    const { commentId } = req.params;

    const [comment] = await db
      .select()
      .from(Comment)
      .where(eq(Comment.id, Number(commentId)));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    const comments = await db
      .select()
      .from(Comment)
      .where(
        and(
          eq(Comment.postId, comment.postId),
          eq(Comment.referenceId, comment.id)
        )
      );

    res.status(200).json({ status: "success", data: comments });
  }
);
