import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import {
  communitiesSchema as Community,
  communityAdminsSchema as CommunityAdmin,
  usersSchema as User,
} from "../schemas";
import { and, eq } from "drizzle-orm";

export const addAdmin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const communityId = req.body?.communityId;
    const userAdmin = req.body?.userId;
    const permissions = req.body?.permissions;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [existAdmin] = await db
      .select()
      .from(CommunityAdmin)
      .where(
        and(
          eq(CommunityAdmin.communityId, communityId),
          eq(CommunityAdmin.userId, userAdmin)
        )
      );

    if (existAdmin) {
      return next(new ApiError("User is already an admin", 400));
    }

    const admins = await db
      .select()
      .from(CommunityAdmin)
      .where(eq(CommunityAdmin.communityId, community.id));

    const checkUserIsAllowed = admins.some(
      (admin) =>
        admin.userId === userId && admin.permissions.includes("manage_users")
    );

    if (community.createdBy !== userId && !checkUserIsAllowed) {
      return next(new ApiError("You are not authorized to add admins", 403));
    }

    const [communityAdmin] = await db
      .insert(CommunityAdmin)
      .values({
        communityId,
        userId: userAdmin,
        permissions: permissions?.length ? permissions : ["manage_posts"],
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Added admin successfully",
      data: communityAdmin,
    });
  }
);

export const updateCommunityAdmin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const userAdmin = req.body?.userId;
    const communityId = req.body?.communityId;
    const permissions = req.body?.permissions;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [existAdmin] = await db
      .select()
      .from(CommunityAdmin)
      .where(
        and(
          eq(CommunityAdmin.communityId, communityId),
          eq(CommunityAdmin.userId, userAdmin)
        )
      );

    if (!existAdmin) {
      return next(
        new ApiError("This user is not an admin in this community", 400)
      );
    }

    const admins = await db
      .select()
      .from(CommunityAdmin)
      .where(eq(CommunityAdmin.communityId, community.id));

    const checkUserIsAllowed = admins.some(
      (admin) =>
        admin.userId === userId && admin.permissions.includes("manage_users")
    );

    if (community.createdBy !== userId && !checkUserIsAllowed) {
      return next(new ApiError("You are not authorized to update admins", 403));
    }

    const [adminCommunity] = await db
      .update(CommunityAdmin)
      .set({ permissions })
      .where(
        and(
          eq(CommunityAdmin.communityId, communityId),
          eq(CommunityAdmin.userId, userAdmin)
        )
      )
      .returning();

    res.status(200).json({
      status: "success",
      message: "Updated admin successfully",
      data: adminCommunity,
    });
  }
);

export const deleteAdmin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const userAdmin = req.body?.userId;
    const communityId = req.body?.communityId;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const admins = await db
      .select()
      .from(CommunityAdmin)
      .where(eq(CommunityAdmin.communityId, community.id));

    const checkUserIsAllowed = admins.some(
      (admin) =>
        admin.userId === userId && admin.permissions.includes("manage_users")
    );

    if (community.createdBy !== userId && !checkUserIsAllowed) {
      return next(new ApiError("You are not authorized to delete admins", 403));
    }

    await db
      .delete(CommunityAdmin)
      .where(
        and(
          eq(CommunityAdmin.userId, userAdmin),
          eq(CommunityAdmin.communityId, communityId)
        )
      );

    res
      .status(200)
      .json({ status: "success", message: "Deleted successfully" });
  }
);

export const getAllAdmins = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const communityId = req.body?.communityId;

    if (!communityId) {
      return next(new ApiError("Community id is required", 400));
    }

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const admins = await db
      .select({
        adminId: CommunityAdmin.userId,
        communityId: CommunityAdmin.communityId,
        permissions: CommunityAdmin.permissions,
        name: User.name,
        email: User.email,
        avatar: User.avatarUrl,
      })
      .from(CommunityAdmin)
      .where(eq(CommunityAdmin.communityId, community.id))
      .innerJoin(User, eq(CommunityAdmin.userId, User.id));

    res.status(200).json({ status: "success", data: admins });
  }
);
