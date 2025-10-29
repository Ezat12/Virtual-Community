import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { unknown, ZodError } from "zod";
import {
  communitiesSchema,
  communityMembershipsSchema,
  joinRequestSchema,
} from "../../schemas";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { ApiError } from "../../utils/apiError";
import { joinRequestValidation } from "../../validations/joinRequest.validation";

export const joinRequestPayload = async (payload: unknown, userId: number) => {
  const validateData = await joinRequestValidation.parseAsync(payload);

  const [community] = await db
    .select()
    .from(communitiesSchema)
    .where(eq(communitiesSchema.id, Number(validateData.communityId)));

  if (!community) {
    throw new ApiError("Community not found", 404);
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
    throw new ApiError("You already have a pending request", 400);
  }

  return { community, validateData };
};

export const validateJoinRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const validateData = await joinRequestValidation.parseAsync(req.body);
      const userId = req.user.id;
      if (!userId) {
        return next(new ApiError("Unauthorized: User not authenticated", 401));
      }

      const { community } = await joinRequestPayload(req.params, req.user.id);
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
