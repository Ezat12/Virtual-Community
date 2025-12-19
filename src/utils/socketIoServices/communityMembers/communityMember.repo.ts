import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import {
  communitiesSchema,
  communityMembershipsSchema,
  joinRequestSchema,
} from "../../../schemas";
import { auditLogSchema } from "../../../schemas/auditLog";

export enum ActionTypes {
  JOIN = "join",
  LEAVE = "leave",
  REMOVE = "remove",
  ACCEPT = "accept",
  REJECT = "reject",
}

export class CommunityMemberRepo {
  async createMember(communityId: number, userId: number) {
    const [communityMemberShip] = await db
      .insert(communityMembershipsSchema)
      .values({ userId, communityId: communityId })
      .returning();

    return communityMemberShip || null;
  }

  async getMember(userId: number, communityId: number) {
    const [member] = await db
      .select()
      .from(communityMembershipsSchema)
      .where(
        and(
          eq(communityMembershipsSchema.userId, userId),
          eq(communityMembershipsSchema.communityId, communityId)
        )
      );

    return member || null;
  }

  async updateMember(
    removedAt: Date | null,
    removedBy: number | null,
    memberId: number,
    communityId: number
  ) {
    const [update] = await db
      .update(communityMembershipsSchema)
      .set({ removedAt, removedBy })
      .where(
        and(
          eq(communityMembershipsSchema.userId, memberId),
          eq(communityMembershipsSchema.communityId, communityId)
        )
      )
      .returning();

    return update || null;
  }

  async getCommunityById(communityId: number) {
    const [community] = await db
      .select()
      .from(communitiesSchema)
      .where(eq(communitiesSchema.id, communityId));

    return community || null;
  }

  async joinRequest(communityId: number, userId: number) {
    const [joinRequest] = await db
      .insert(joinRequestSchema)
      .values({
        communityId: communityId,
        userId,
        status: "pending",
      })
      .returning();

    return joinRequest || null;
  }

  async getRequestById(requestId: number) {
    const [requestMember] = await db
      .select()
      .from(joinRequestSchema)
      .where(eq(joinRequestSchema.id, Number(requestId)));

    return requestMember || null;
  }

  async updateRequestStatus(
    action: "accepted" | "rejected" | "pending",
    requestId: number,
    communityId: number
  ) {
    const [request] = await db
      .update(joinRequestSchema)
      .set({ status: action })
      .where(
        and(
          eq(joinRequestSchema.communityId, communityId),
          eq(joinRequestSchema.id, Number(requestId))
        )
      )
      .returning();

    return request || null;
  }

  async deleteRequest(requestId: number) {
    await db
      .delete(joinRequestSchema)
      .where(eq(joinRequestSchema.id, Number(requestId)));
  }

  async auditLogs(
    communityId: number,
    actorId: number,
    targetId: number,
    action: ActionTypes,
    visibility: "public" | "private" = "public"
  ) {
    const [auditLogs] = await db
      .insert(auditLogSchema)
      .values({
        communityId: communityId,
        actorId,
        targetId,
        action,
        visibility,
      })
      .returning();

    return auditLogs || null;
  }
}
