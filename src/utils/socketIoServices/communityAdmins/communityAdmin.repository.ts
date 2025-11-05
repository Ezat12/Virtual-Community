import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { communitiesSchema, communityAdminsSchema } from "../../../schemas";
import { Permission } from "./socketCommunityAdmin";

export class CommunityAdminRepo {
  async create(
    communityId: number,
    userAdmin: number,
    permissions: Permission[]
  ) {
    const [communityAdmin] = await db
      .insert(communityAdminsSchema)
      .values({
        communityId,
        userId: userAdmin,
        permissions: permissions,
      })
      .returning();
  }

  async findByIdCommunity(communityId: number) {
    const [community] = await db
      .select()
      .from(communitiesSchema)
      .where(eq(communitiesSchema.id, communityId));

    return community || null;
  }

  async findAdmin(communityId: number, userAdmin: number) {
    const [existAdmin] = await db
      .select()
      .from(communityAdminsSchema)
      .where(
        and(
          eq(communityAdminsSchema.communityId, communityId),
          eq(communityAdminsSchema.userId, userAdmin)
        )
      );

    return existAdmin || null;
  }

  async getAdmins(communityId: number) {
    const admins = await db
      .select()
      .from(communityAdminsSchema)
      .where(eq(communityAdminsSchema.communityId, communityId));

    return admins;
  }

  async update(communityId: number, userAdmin: number, perms: Permission[]) {
    const [adminCommunity] = await db
      .update(communityAdminsSchema)
      .set({ permissions: perms })
      .where(
        and(
          eq(communityAdminsSchema.communityId, communityId),
          eq(communityAdminsSchema.userId, userAdmin)
        )
      )
      .returning();

    return adminCommunity || null;
  }

  async deleteAdmin(communityId: number, userAdmin: number) {
    await db
      .delete(communityAdminsSchema)
      .where(
        and(
          eq(communityAdminsSchema.userId, userAdmin),
          eq(communityAdminsSchema.communityId, communityId)
        )
      );
  }
}
