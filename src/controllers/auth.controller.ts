import { Request, Response, NextFunction, response } from "express";
import expressAsyncHandler from "express-async-handler";
import { usersSchema as User } from "../schemas";
import { db } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StringValue } from "ms";
import { and, eq, gt, InferSelectModel } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { emailVerifications as EmailVerifications } from "../schemas/emailVerifications";
import { sendVerifyEmail } from "../utils/Email/sendVerifyEmail";
import { alias } from "drizzle-orm/pg-core";

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

type UserType = InferSelectModel<typeof User>;
const sentEmailToVerify = async (user: Partial<UserType>) => {
  const code: string = Math.floor(100000 + Math.random() * 900000).toString();
  const expires: Date = new Date(Date.now() + 10 * 60 * 1000);

  const [emailVerification] = await db
    .insert(EmailVerifications)
    .values({ userId: user.id, code, expired_at: expires })
    .returning();

  console.log(emailVerification);

  await sendVerifyEmail(String(user.email), code);

  return emailVerification;
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

    await sentEmailToVerify(user);
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

    if (!user.emailVerified) {
      await sentEmailToVerify(user);
    }
  }
);

export const logout = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const [user] = await db.select().from(User).where(eq(User.id, userId));

    if (!user) {
      return next(new ApiError("User not found", 404));
    }

    res
      .status(200)
      .json({ staTUS: "success", message: "Logged out successfully" });
  }
);

export const verifyEmail = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const code: string = req.body.code;

    if (!code) {
      return next(new ApiError("Code is required", 400));
    }

    const [user] = await db.select().from(User).where(eq(User.id, userId));

    if (!user) {
      return next(new ApiError("User not found", 404));
    }

    const ev = alias(EmailVerifications, "ev");

    const [emailCode] = await db
      .select()
      .from(ev)
      .where(
        and(
          eq(ev.userId, user.id),
          eq(ev.code, code),
          eq(ev.used, false),
          gt(ev.expired_at, new Date())
        )
      );

    if (!emailCode) {
      return next(new ApiError("Invalid or expired code", 400));
    }

    await db.update(ev).set({ used: true }).where(eq(ev.id, emailCode.id));

    await db
      .update(User)
      .set({ emailVerified: true })
      .where(eq(User.id, userId));

    res
      .status(200)
      .json({ status: "success", message: "Email verified successfully" });
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
    next();
  }
);

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

export const allowedTo = (...roles: string[]) => {
  expressAsyncHandler((req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError("You are not logged in", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403)
      );
    }

    next();
  });
};

export const getUserProfile = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const [user] = await db.select().from(User).where(eq(User.id, req.user.id));
    if (!user) {
      return next(new ApiError("User not found", 404));
    }

    const { password, ...userData } = user;

    res.status(200).json({ status: "success", data: userData });
  }
);