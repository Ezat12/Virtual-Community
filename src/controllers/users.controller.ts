import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db } from "../db";
import { usersSchema as Users } from "../schemas/usersSchema";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // if (req.file) {
    
  // }
  const hashPassword = await bcrypt.hash(req.body.password, 10);

  const [user] = await db
    .insert(Users)
    .values({
      name: req.body.name,
      email: req.body.email,
      password: hashPassword,
      role: req.body.role || "user",
      avatarUrl: req.body.avatarUrl || null,
      bio: req.body.bio || null,
    })
    .returning();

  res.status(201).json({ status: "success", data: user });
};

export const getAllUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const users = await db.select().from(Users);

  res.status(200).json({ status: "success", data: users });
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const [user] = await db
    .select()
    .from(Users)
    .where(eq(Users.id, Number(id)));

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  res.status(200).json({ status: "success", data: user });
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const [user] = await db
    .select()
    .from(Users)
    .where(eq(Users.id, Number(id)));

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  const updateData: Partial<typeof Users.$inferInsert> = {
    name: req.body.name || user.name,
    password: req.body.password
      ? await bcrypt.hash(req.body.password, 10)
      : user.password,
    avatarUrl: req.body.avatarUrl || user.avatarUrl,
    bio: req.body.bio || user.bio,
  };

  const userUpdated = await db
    .update(Users)
    .set(updateData)
    .where(eq(Users.id, Number(id)))
    .returning();

  res.status(200).json({ status: "success", data: userUpdated });
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const [user] = await db
    .select()
    .from(Users)
    .where(eq(Users.id, Number(id)));

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  await db.delete(Users).where(eq(Users.id, Number(id)));

  res.status(200).json({ status: "success", message: "Deleted successfully" });
};
