import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationRegisterUserSchema } from "../validations/users.validation";
import { string, ZodError } from "zod";
import { db } from "../db";
import { usersSchema } from "../schemas";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";

export const validateUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validateData = await validationRegisterUserSchema.parseAsync(
        req.body
      );

      const [user] = await db
        .select()
        .from(usersSchema)
        .where(eq(usersSchema.email, validateData.email));

      if (user) {
        return next(new ApiError("Email is exists", 400));
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
