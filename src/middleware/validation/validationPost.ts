import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import {
  communitiesSchema,
  communityAdminsSchema,
  communityMembershipsSchema,
  postsSchema,
} from "../../schemas";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { postValidationSchema } from "../../validations/post.validation";
import { ApiError } from "../../utils/apiError";
import { ZodError } from "zod";

export const validatePostCreated = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validateData = await postValidationSchema.parseAsync(req.body);

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, Number(req.params.communityId)));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      const [communityMember] = await db
        .select()
        .from(communityMembershipsSchema)
        .where(
          and(
            eq(communityMembershipsSchema.communityId, community.id),
            eq(communityMembershipsSchema.userId, req.user.id)
          )
        );

      if (!communityMember) {
        return next(
          new ApiError("User is not a member of this community", 403)
        );
      }

      req.body = validateData;
      req.community = community;
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

export const validateGetPostById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const communityId = req.params.communityId;

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, Number(communityId)));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      const [communityMember] = await db
        .select()
        .from(communityMembershipsSchema)
        .where(
          and(
            eq(communityMembershipsSchema.communityId, community.id),
            eq(communityMembershipsSchema.userId, req.user.id)
          )
        );

      if (!communityMember && community.privacy === "private") {
        return next(
          new ApiError("User is not a member of this community", 403)
        );
      }

      req.community = community;
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

export const validateDeletePostById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      const communityId = req.params.communityId;
      const postId = req.params.postId;

      const [[community], [post], [adminsPost]] = await Promise.all([
        db
          .select()
          .from(communitiesSchema)
          .where(eq(communitiesSchema.id, Number(communityId))),
        db
          .select()
          .from(postsSchema)
          .where(eq(postsSchema.id, Number(postId))),
        db
          .select()
          .from(communityAdminsSchema)
          .where(
            and(
              eq(communityAdminsSchema.communityId, Number(communityId)),
              eq(communityAdminsSchema.userId, user.id),
              eq(communityAdminsSchema.permissions, ["manage_posts"])
            )
          ),
      ]);

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      if (!post) {
        return next(new ApiError("Post not found", 404));
      }

      if (
        post.userId !== user.id &&
        community.createdBy !== user.id &&
        !adminsPost
      ) {
        return next(
          new ApiError("You are not authorized to delete this post", 403)
        );
      }

      req.community = community;
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
