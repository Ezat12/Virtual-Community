import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { communityAdminSchemaValidation } from "../validations/communityAdmin.validation";
import { ZodError } from "zod";
import { communityAdminsSchema, usersSchema } from "../schemas";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { ApiError } from "../utils/apiError";

export const validateCommunityAdmin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validateData = await communityAdminSchemaValidation.parseAsync({
        ...req.body,
        communityId: Number(req.body.communityId),
        userId: Number(req.body.userId),
      });

      const [user] = await db
        .select()
        .from(usersSchema)
        .where(eq(usersSchema.id, validateData.userId));

      if (!user) {
        return next(new ApiError("User not found", 404));
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
