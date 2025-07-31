import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../../utils/apiError";
import { usersSchema as User } from "../../schemas";
import { jwtConfig } from "../../controllers/auth.controller";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const protectWithoutEmailVerify = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new ApiError("You are not logged in", 401));
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as {
      userId: number;
      role: string;
    };

    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.id, decoded.userId));

    if (!user) {
      return next(new ApiError("User not found", 404));
    }

    req.user = user;
    next();
  }
);
