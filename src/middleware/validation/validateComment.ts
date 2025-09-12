import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationAddComment } from "../../validations/comment.validation";
import { db } from "../../db";
import {
  commentsSchema,
  communitiesSchema,
  communityAdminsSchema,
  postsSchema,
} from "../../schemas";
import { and, eq } from "drizzle-orm";
import { ApiError } from "../../utils/apiError";
import { ZodError } from "zod";

export const validateComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validateData = await validationAddComment.parseAsync(req.body);

      console.log(req.params.postId);

      const [comment] = await db
        .select()
        .from(commentsSchema)
        .where(eq(commentsSchema.id, Number(req.params.commentId)));

      if (!comment) {
        return next(new ApiError("Comment not found", 404));
      }

      req.body = validateData;

      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const uniqueErrors: Record<string, string> = {};

        e.issues.forEach((err) => {
          const field: string = err.path.join(".");
          if (!uniqueErrors[field]) {
            uniqueErrors[field] = err.message;
          }
        });

        const errors = Object.entries(uniqueErrors).map(([field, message]) => ({
          field,
          message,
        }));

        res.status(400).json({ status: "error", errors });
      }

      console.log(e);

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);

export const validateDeleteComment = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const user = req.user;

      const [comment] = await db
        .select()
        .from(commentsSchema)
        .where(eq(commentsSchema.id, Number(commentId)));

      if (!comment) {
        return next(new ApiError("Comment not found", 404));
      }

      const postId = comment.postId;

      const [post] = await db
        .select()
        .from(postsSchema)
        .where(eq(postsSchema.id, postId));

      if (!post) {
        return next(new ApiError("Post not found", 404));
      }

      const communityId = post.communityId;

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, communityId));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      const [checkAdmin] = await db
        .select()
        .from(communityAdminsSchema)
        .where(
          and(
            eq(communityAdminsSchema.communityId, community.id),
            eq(communityAdminsSchema.userId, user.id),
            eq(communityAdminsSchema.permissions, ["manage_posts"])
          )
        );

      if (
        !checkAdmin &&
        comment.userId !== user.id &&
        community.createdBy !== user.id
      ) {
        return next(
          new ApiError("You are not authorized to delete this comment", 403)
        );
      }

      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const uniqueErrors: Record<string, string> = {};

        e.issues.forEach((err) => {
          const field: string = err.path.join(".");
          if (!uniqueErrors[field]) {
            uniqueErrors[field] = err.message;
          }
        });

        const errors = Object.entries(uniqueErrors).map(([field, message]) => ({
          field,
          message,
        }));

        res.status(400).json({ status: "error", errors });
      }

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);
