import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ZodError } from "zod";
import {
  communitiesSchema,
  communityMembershipsSchema,
  joinRequestSchema,
} from "../../schemas";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { ApiError } from "../../utils/apiError";
import { joinRequestValidation } from "../../validations/joinRequest.validation";

export const validateJoinRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const validateData = await joinRequestValidation.parseAsync(req.body);
      const userId = req.user.id;
      if (!userId) {
        return next(new ApiError("Unauthorized: User not authenticated", 401));
      }
      const validateData = await joinRequestValidation.parseAsync(req.params);

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.id, Number(validateData.communityId)));

      if (!community) {
        return next(new ApiError("Community not found", 404));
      }

      // Check if already a member
      const [existingMembership] = await db
        .select()
        .from(communityMembershipsSchema)
        .where(
          and(
            eq(communityMembershipsSchema.communityId, community.id),
            eq(communityMembershipsSchema.userId, userId)
          )
        );

      if (existingMembership) {
        return next(new ApiError("You are already a member", 400));
      }

      // Check if already has pending request
      const [existingRequest] = await db
        .select()
        .from(joinRequestSchema)
        .where(
          and(
            eq(joinRequestSchema.communityId, community.id),
            eq(joinRequestSchema.userId, userId),
            eq(joinRequestSchema.status, "pending")
          )
        );

      if (existingRequest) {
        return next(new ApiError("You already have a pending request", 400));
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
