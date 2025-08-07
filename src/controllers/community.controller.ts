import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import { communitiesSchema as Community, usersSchema } from "../schemas";
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

export const getCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const communityId = Number(req.params.id);

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, communityId));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    // if (community.createdBy !== req.user.id || req.user.role !== "admin") {
    //   return next(
    //     new ApiError("You are not allowed to get this community", 401)
    //   );
    // }
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

// export const
