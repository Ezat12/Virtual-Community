import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../db";
import {
  commentsSchema as Comments,
  postsSchema as Post,
  usersSchema as User,
} from "../schemas";
import { and, eq, sql } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { likesSchema as Like } from "../schemas/likes";
import { ApiFeatures } from "../utils/ApiFeatures";
import { NotificationService } from "../utils/notificationService";

export const addReaction = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const user = req.user;
    const reaction = req.body?.reaction;

    if (
      !reaction ||
      !["like", "love", "haha", "wow", "sad", "angry"].includes(reaction)
    ) {
      return next(new ApiError("Please provide valid reaction", 400));
    }

    const [post] = await db
      .select()
      .from(Post)
      .where(eq(Post.id, Number(postId)));

    if (!post) {
      return next(new ApiError("Post not found", 404));
    }

    const [newLike] = await db
      .insert(Like)
      .values({
        postId: post.id,
        userId: user.id,
        reactions: reaction ?? "like",
      })
      .returning();

    await NotificationService.likedPost(user.id, user.name);

    res.status(201).json({ status: "success", data: newLike });
  }
);

export const removeLike = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { likeId } = req.params;
    const user = req.user;

    // const [post] = await db
    //   .select()
    //   .from(Post)
    //   .where(eq(Post.id, Number(postId)));

    // if (!post) {
    //   return next(new ApiError("Post not found", 404));
    // }

    const [deleteResult] = await db
      .delete(Like)
      .where(and(eq(Like.id, Number(likeId)), eq(Like.userId, user.id)))
      .returning();

    if (!deleteResult) {
      return next(new ApiError("Not found like", 404));
    }

    res
      .status(200)
      .json({ status: "success", message: "Like removed successfully" });
  }
);

export const updateReaction = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { likeId } = req.params;
    const reaction = req.body.reaction;
    const user = req.user;

    if (
      !reaction ||
      !["like", "love", "haha", "wow", "sad", "angry"].includes(reaction)
    ) {
      return next(new ApiError("Please provide valid reaction", 400));
    }

    const [updateReaction] = await db
      .update(Like)
      .set({ reactions: reaction })
      .where(and(eq(Like.id, Number(likeId)), eq(Like.userId, user.id)))
      .returning();

    if (!updateReaction) {
      return next(new ApiError("User not add reaction in this post", 400));
    }

    await NotificationService.likedPost(user.id, user.name);

    res.status(200).json({
      status: "success",
      message: "Updated successfully",
      data: updateReaction,
    });
  }
);

export const getLike = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { likeId } = req.params;

    const [like] = await db
      .select({
        likeId: Like.id,
        reaction: Like.reactions,
        createdAt: Like.createdAt,
        userId: User.id,
        userName: User.name,
        userEmail: User.email,
        userAvatar: User.avatarUrl,
      })
      .from(Like)
      .where(eq(Like.id, Number(likeId)))
      .innerJoin(User, eq(Like.userId, User.id));

    if (!like) {
      return next(new ApiError("Like not found", 404));
    }

    res.status(200).json({ status: "success", data: like });
  }
);

export const getAllLikesToPost = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;

    const [post] = await db
      .select()
      .from(Post)
      .where(eq(Post.id, Number(postId)));

    if (!post) {
      return next(new ApiError("Post not found", 404));
    }

    const query = { ...req.query, postId: post.id.toString() };

    const features = new ApiFeatures(db, Like, query, {
      likeId: Like.id,
      reaction: Like.reactions,
      createdAt: Like.createdAt,
      userId: User.id,
      userName: User.name,
      userEmail: User.email,
      userAvatar: User.avatarUrl,
    });

    const finalQuery = features
      .join(User, eq(Like.userId, User.id), "left")
      .filter()

      .sort()
      .selectFields()
      .paginate()
      .build();

    const result = await finalQuery;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Like);

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

export const addLikeToComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { commentId } = req.params;

    const reaction = req.body?.reaction;

    if (
      !reaction ||
      !["like", "love", "haha", "wow", "sad", "angry"].includes(reaction)
    ) {
      return next(new ApiError("Please provide valid reaction", 400));
    }

    const [comment] = await db
      .select()
      .from(Comments)
      .where(eq(Comments.id, Number(commentId)));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    const [existLike] = await db
      .select()
      .from(Like)
      .where(and(eq(Like.commentId, comment.id), eq(Like.userId, user.id)));

    console.log(existLike);

    if (existLike) {
      const [updateLike] = await db
        .update(Like)
        .set({ reactions: reaction })
        .returning();

      res.status(200).json({ status: "success", data: updateLike });
    } else {
      const [newLike] = await db
        .insert(Like)
        .values({
          postId: comment.postId,
          userId: user.id,
          commentId: comment.id,
        })
        .returning();

      const [updateCountCommentLike] = await db
        .update(Comments)
        .set({ likesCount: comment.likesCount + 1 })
        .returning();

      await NotificationService.likedComment(user.id, user.name);

      res.status(201).json({
        status: "success",
        message: "Successfully added comment",
        like: newLike,
        comment: updateCountCommentLike,
      });
    }
  }
);

export const getAllLikeToComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = req.params;

    const [comment] = await db
      .select()
      .from(Comments)
      .where(eq(Comments.id, Number(commentId)));

    if (!comment) {
      return next(new ApiError("Comment not found", 404));
    }

    const getAll = await db
      .select({
        commentId: Comments.id,
        userId: User.id,
        username: User.name,
        userAvatar: User.avatarUrl,
        createdAt: Comments.createdAt,
      })
      .from(Comments)
      .where(eq(Comments.id, Number(commentId)))
      .leftJoin(User, eq(User.id, Comments.userId));

    res.status(200).json({ status: "success", data: getAll });
  }
);
