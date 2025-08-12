import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import {
  communitiesSchema as Community,
  usersSchema,
  communityAdminsSchema as CommunityAdmin,
} from "../schemas";
import { and, eq, sql } from "drizzle-orm";
import { ApiFeatures } from "../utils/ApiFeatures";
import { count } from "console";

export const createCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const name = req.body.name;
    const description = req.body.description;

    const [community] = await db
      .insert(Community)
      .values({
        name,
        description,
        avatarUrl: req.body.avatarUrl || null,
        createdBy: userId,
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Community created successfully",
      data: community,
    });
  }
);

export const getCommunityById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const communityId = Number(req.params.id);

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: community,
    });
  }
);

export const getAllCommunities = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // const communities = db.select().from(Community);

    const features = new ApiFeatures(db, Community, req.query, {
      id: Community.id,
      name: Community.name,
      description: Community.description,
      createdBy: Community.createdBy,
    });

    const finalQuery = features
      .filter()
      .sort()
      .selectFields()
      .paginate()
      .build();

    const result = await finalQuery;

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Community);

    res.status(200).json({
      status: "success",
      results: result.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: result,
    });
  }
);

export const updateCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const communityId = Number(req.params.id);

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
        admin.userId === userId && admin.permissions.includes("edit_settings")
    );

    if (
      community.createdBy !== userId &&
      req.user.role !== "admin" &&
      checkUserIsAllowed
    ) {
      return next(
        new ApiError("You are not authorized to update this community", 403)
      );
    }

    const updatedCommunity = await db
      .update(Community)
      .set({
        name: req.body?.name ? req.body?.name : community.name,
        description: req.body.description
          ? req.body?.description
          : community.description,
        avatarUrl: req.body?.avatarUrl
          ? req.body?.avatarUrl
          : community.avatarUrl,
      })
      .where(eq(Community.id, communityId))
      .returning();

    res.status(200).json({
      status: "success",
      message: "Community updated successfully",
      data: updatedCommunity,
    });
  }
);

export const deleteCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const communityId = Number(req.params.id);

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    if (community.createdBy !== userId && req.user.role !== "admin") {
      return next(
        new ApiError("You are not authorized to delete this community", 403)
      );
    }

    await db.delete(Community).where(eq(Community.id, communityId));

    res.status(200).json({
      status: "success",
      message: "Community deleted successfully",
    });
  }
);
