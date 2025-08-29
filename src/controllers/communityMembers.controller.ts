import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../db";
import {
  communitiesSchema as Community,
  communityAdminsSchema as CommunityAdmins,
  communityMembershipsSchema as CommunityMemberShip,
  joinRequestSchema as JoinRequest,
  usersSchema,
} from "../schemas";
import { and, eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";

const IsAdminToManageUsers = async (communityId: number, id: number) => {
  const [isAdmin] = await db
    .select()
    .from(CommunityAdmins)
    .where(
      and(
        eq(CommunityAdmins.communityId, communityId),
        eq(CommunityAdmins.userId, id),
        eq(CommunityAdmins.permissions, ["manage_users"])
      )
    );

  if (!isAdmin) {
    return false;
  }

  return true;
};

export const joinCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const community = req.community;

    if (community.privacy === "public") {
      const [communityMemberShip] = await db
        .insert(CommunityMemberShip)
        .values({ userId, communityId: community.id })
        .returning();

      res.status(201).json({
        status: "success",
        message: "Added member successfully",
        data: communityMemberShip,
      });
    } else {
      const [joinRequest] = await db
        .insert(JoinRequest)
        .values({
          communityId: community.id,
          userId,
          status: "pending",
        })
        .returning();

      res.status(201).json({
        status: "success",
        message: "Your join request is pending approval",
        data: joinRequest,
      });
    }
  }
);

export const leaveCommunity = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    const { communityId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [dataLeavingMember] = await db
      .delete(CommunityMemberShip)
      .where(
        and(
          eq(CommunityMemberShip.userId, userId),
          eq(Community.id, Number(communityId))
        )
      )
      .returning();

    res.status(200).json({
      status: "success",
      message: "Deleted member successfully",
      data: dataLeavingMember,
    });
  }
);

export const deleteMemberByAdmin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { communityId, memberId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!communityId) {
      return next(new ApiError("Community not found", 404));
    }

    const [communityMemberShip] = await db
      .select()
      .from(CommunityMemberShip)
      .where(
        and(
          eq(CommunityMemberShip.userId, Number(memberId)),
          eq(CommunityMemberShip.communityId, community.id)
        )
      );

    if (!communityMemberShip) {
      return next(new ApiError("Not found member in this community", 404));
    }

    if (Number(memberId) === user.id) {
      return next(new ApiError("Admins cannot remove themselves", 400));
    }

    const canManageUsers = await IsAdminToManageUsers(community.id, user.id);
    if (!canManageUsers && community.createdBy !== user.id) {
      return next(
        new ApiError("You are not authorized to access this route", 403)
      );
    }

    const [member] = await db
      .update(CommunityMemberShip)
      .set({ removedAt: new Date(), removedBy: user.id })
      .where(
        and(
          eq(CommunityMemberShip.userId, Number(memberId)),
          eq(CommunityMemberShip.communityId, Number(communityId))
        )
      )
      .returning();

    res.status(200).json({
      status: "success",
      message: "Remove member successfully",
      data: member,
    });
  }
);

export const getPendingRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const { communityId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const canManageUsers = await IsAdminToManageUsers(community.id, user.id);
    if (!canManageUsers && community.createdBy !== user.id) {
      return next(
        new ApiError("You are not authorized to access this route", 403)
      );
    }

    const allPendingRequest = await db
      .select({
        requestId: JoinRequest.id,
        userId: usersSchema.id,
        userName: usersSchema.name,
        userImage: usersSchema.avatarUrl,
        userEmail: usersSchema.email,
        status: JoinRequest.status,
      })
      .from(JoinRequest)
      .where(
        and(
          eq(JoinRequest.communityId, community.id),
          eq(JoinRequest.status, "pending")
        )
      )
      .innerJoin(usersSchema, eq(usersSchema.id, JoinRequest.userId));

    res.status(200).json({ status: "success", data: allPendingRequest });
  }
);

export const handleJoinRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { communityId, requestId } = req.params;
    const action = req.body?.action;

    if (!action) {
      return next(new ApiError("Action must be required", 400));
    }

    if (!["accepted", "rejected"].includes(action)) {
      return next(new ApiError("Invalid action", 400));
    }

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const canManageUsers = await IsAdminToManageUsers(community.id, user.id);
    if (!canManageUsers && community.createdBy !== user.id) {
      return next(
        new ApiError("You are not authorized to access this route", 403)
      );
    }

    const [request] = await db
      .update(JoinRequest)
      .set({ status: action })
      .where(
        and(
          eq(JoinRequest.communityId, community.id),
          eq(JoinRequest.id, Number(requestId))
        )
      )
      .returning();

    if (!request) {
      return next(new ApiError("Join request not found", 404));
    }

    if (action === "accepted") {
      await db.insert(CommunityMemberShip).values({
        userId: request.userId,
        communityId: community.id,
      });
    }

    res.status(200).json({ status: "success", data: request });
  }
);

export const getAllMembers = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { communityId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    if (community.privacy === "private") {
      const [isMember] = await db
        .select()
        .from(CommunityMemberShip)
        .where(
          and(
            eq(CommunityMemberShip.userId, user.id),
            eq(CommunityMemberShip.communityId, community.id)
          )
        );

      const canManageUsers = await IsAdminToManageUsers(community.id, user.id);

      if (!isMember && !canManageUsers && community.createdBy !== user.id) {
        return next(
          new ApiError("You are not authorized to access this route", 403)
        );
      }
    }

    const allMembers = await db
      .select({
        userId: CommunityMemberShip.userId,
        userName: usersSchema.name,
        userImage: usersSchema.avatarUrl,
        userEmail: usersSchema.email,
      })
      .from(CommunityMemberShip)
      .innerJoin(usersSchema, eq(usersSchema.id, CommunityMemberShip.userId))
      .where(eq(CommunityMemberShip.communityId, community.id));

    res.status(200).json({ status: "success", data: allMembers });
  }
);
