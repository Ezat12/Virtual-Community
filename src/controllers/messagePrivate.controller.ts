import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { messagePrivateSchema } from "../schemas/messagePrivate";
import expressAsyncHandler from "express-async-handler";

export const sendPrivateMessage = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    const [message] = await db
      .insert(messagePrivateSchema)
      .values({ senderId, receiverId, content })
      .returning();

    res.status(201).json({ status: "success", data: message });
  }
);

