import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationAddComment } from "../../validations/comment.validation";
import { db } from "../../db";
import {
  communitiesSchema,
  communityAdminsSchema,
  communityMembershipsSchema,
  messageCommunitySchema,
} from "../../schemas";
import { and, eq, sql } from "drizzle-orm";
import { ApiError } from "../../utils/apiError";
import { number, ZodError } from "zod";
import {
  sendMessageToCommunityValidation,
  updateMessageToCommunityValidation,
} from "../../validations/messageCommunity.validation";

export const validateSendMessageToCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = { ...req.body, ...req.params };
      await sendMessageToCommunityValidation.parseAsync(data);

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, Number(req.params.communityId)));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      const [isMember] = await db
        .select()
        .from(communityMembershipsSchema)
        .where(
          and(
            eq(communityMembershipsSchema.userId, req.user.id),
            eq(communityMembershipsSchema.communityId, community.id)
          )
        );

      if (!isMember) {
        return next(
          new ApiError("You are not a member in this community", 403)
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

      console.log(e);

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);

export const validateUpdateMessageToCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId } = req.params;

      await updateMessageToCommunityValidation.parseAsync(req.body);

      const [message] = await db
        .select()
        .from(messageCommunitySchema)
        .where(eq(messageCommunitySchema.id, Number(messageId)));

      if (!message) {
        return next(new ApiError("Message not found", 404));
      }

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, message.communityId));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      if (req.user.id !== message.senderId) {
        return next(
          new ApiError("You are not allowed to update the message", 403)
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

      console.log(e);

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);

export const validateDeleteMessageToCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId } = req.params;

      const [message] = await db
        .select()
        .from(messageCommunitySchema)
        .where(eq(messageCommunitySchema.id, Number(messageId)));

      if (!message) {
        return next(new ApiError("Message not found", 404));
      }

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, message.communityId));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      const [isAdmin] = await db
        .select()
        .from(communityAdminsSchema)
        .where(
          and(
            eq(communityAdminsSchema.userId, req.user.id),
            eq(communityAdminsSchema.communityId, community.id),
            sql`${communityAdminsSchema.permissions} && ARRAY['manage_users','edit_settings','manage_posts']::permissions[]`
          )
        );

      if (
        req.user.id !== message.senderId &&
        req.user.id !== community.createdBy &&
        !isAdmin
      ) {
        return next(
          new ApiError("You are not allowed to delete the message", 403)
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

      console.log(e);

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);
