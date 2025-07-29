import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { usersSchema as User } from "../schemas";
import { db } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StringValue } from "ms";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
// import "./types/express";
// import "dotenv/config";

interface JwtConfig {
  secret: string;
  expiresIn: StringValue;
}

const jwtConfig: JwtConfig = {
  secret: process.env.SECRET_KEY_JWT as string,
  expiresIn: process.env.EXPIRED_IN_JWT as StringValue,
};

const getToken = (
  payload: { userId: number; role: string },
  secret: string,
  expiresIn: StringValue
) => {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
  });
};

export const signup = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const hashPassword = await bcrypt.hash(req.body.password, 10);

    const [user] = await db
      .insert(User)
      .values({
        name: req.body.name,
        email: req.body.email,
        password: hashPassword,
        role: req.body.role || "user",
        avatarUrl: req.body.avatarUrl || null,
        bio: req.body.bio || null,
      })
      .returning();

    const token = getToken(
      { userId: user.id, role: user.role as string },
      jwtConfig.secret,
      jwtConfig.expiresIn
    );

    res.status(201).json({ status: "success", data: user, token });
  }
);

export const login = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const [user] = await db.select().from(User).where(eq(User.email, email));

    if (!user) {
      return next(new ApiError("email or password not correct", 400));
    }

    const correctPassword = await bcrypt.compare(password, user.password);

    if (!correctPassword) {
      return next(new ApiError("email or password not correct", 400));
    }

    const token = getToken(
      { userId: user.id, role: user.role as string },
      jwtConfig.secret,
      jwtConfig.expiresIn
    );

    res.status(201).json({ status: "success", data: user, token });
  }
);

export const protectAuth = expressAsyncHandler(
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

    if (!user.emailVerified) {
      return next(new ApiError("Please verify your email", 403));
    }

    req.user = user;
    console.log("User authenticated:", req.user);
    next();
  }
);

// export const getUserProfile = expressAsyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const [user] = await db.select().from(User).where(eq(User.id, req.user.id));
//     if (!user) {
//       return next(new ApiError("User not found", 404));
//     }
//     res.status(200).json({ status: "success", data: user });
//   }
// );
