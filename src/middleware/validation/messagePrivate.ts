import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../../db";
import { usersSchema } from "../../schemas";
import { and, eq } from "drizzle-orm";
import { ApiError } from "../../utils/apiError";
import { ZodError } from "zod";
import { sendMessagePrivateValidation } from "../../validations/messagePrivate.validation";

export const validateSendMessagePrivate = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      await sendMessagePrivateValidation.parseAsync(data);

      const [user] = await db
        .select()
        .from(usersSchema)
        .where(eq(usersSchema.id, req.body.receiverId));

      if (!user) {
        return next(
          new ApiError("User not found to receiver this message", 404)
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

      console.log(e);

      res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
);
