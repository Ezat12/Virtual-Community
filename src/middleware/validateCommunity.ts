import { NextFunction, Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationCreateCommunity } from "../validations/community.validation";
import { db } from "../db";
import { communitiesSchema } from "../schemas";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { ZodError } from "zod";

export const validateCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validateData = await validationCreateCommunity.parseAsync(req.body);

      const [community] = await db
        .select()
        .from(communitiesSchema)
        .where(eq(communitiesSchema.name, validateData.name));

      if (community) {
        return next(new ApiError("Community is exists", 400));
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

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);
