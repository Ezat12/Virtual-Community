import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../../db";
import { usersSchema } from "../../schemas";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/apiError";
import { any, ZodError } from "zod";
import {
  sendMessagePrivateValidation,
  updateMessagePrivateValidation,
} from "../../validations/messagePrivate.validation";
import { messagePrivateSchema } from "../../schemas/messagePrivate";

export const validateSendMessagePrivate = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      await sendMessagePrivateValidation.parseAsync(data);

      if (req.body.receiverId === req.user.id) {
        return next(new ApiError("Cannot send message to yourself", 400));
      }

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
      } else {
        res
          .status(500)
          .json({ status: "error", message: "Something went wrong" });
      }
    }
  }
);

export const validateUpdateMessagePrivate = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      await updateMessagePrivateValidation.parseAsync(data);

      const messageId = Number(req.params.messageId);

      const [message] = await db
        .select()
        .from(messagePrivateSchema)
        .where(eq(messagePrivateSchema.id, messageId));

      if (!message) {
        return next(new ApiError("Message not found", 404));
      }

      if (message.senderId !== req.user.id) {
        return next(
          new ApiError("You are not allowed to update this message", 404)
        );
      }
      if (message.isRead) {
        return next(
          new ApiError(
            "You cannot edit this message because it has already been read",
            403
          )
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

export const validateDeleteMessagePrivate = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messageId = Number(req.params.messageId);

      const [message] = await db
        .select()
        .from(messagePrivateSchema)
        .where(eq(messagePrivateSchema.id, messageId));

      if (!message) {
        return next(new ApiError("Message not found", 404));
      }

      if (message.senderId !== req.user.id) {
        return next(
          new ApiError("You are not allowed to delete this message", 404)
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
