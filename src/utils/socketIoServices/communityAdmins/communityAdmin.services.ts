import z from "zod";
import { ApiError } from "../../apiError";
import { NotificationService } from "../../notificationService";
import {
  AuthenticationUser,
  CanMangeAdmin,
  CommunityAdminAuth,
} from "./communityAdmin.auth";
import { CommunityAdminRepo } from "./communityAdmin.repository";
import { Permission, PERMISSIONS } from "./socketCommunityAdmin";

function normalizePermissions(input?: unknown): Permission[] {
  if (!input) return ["manage_posts"];
  if (!Array.isArray(input)) return ["manage_posts"];
  const result: Permission[] = [];
  for (const p of input) {
    if (
      typeof p === "string" &&
      (PERMISSIONS as readonly string[]).includes(p)
    ) {
      result.push(p as Permission);
    }
  }
  return result.length ? result : ["manage_posts"];
}

export class CommunityAdminsServices {
  constructor(private repo: CommunityAdminRepo) {}

  async addAdmin(
    userId: number,
    communityId: number,
    userAdmin: number,
    permissions: Permission[]
  ) {
    const authUser = new AuthenticationUser();
    const user = new CommunityAdminAuth([authUser]);
    const ok = user.check({ userId });
    if (!ok) {
      throw new ApiError("Un Authentication", 401);
    }

    const community = await this.repo.findByIdCommunity(communityId);
    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const existAdmin = await this.repo.findAdmin(community.id, userAdmin);
    if (existAdmin) {
      throw new ApiError("User is already an admin", 400);
    }

    const admins = await this.repo.getAdmins(community.id);
    const canMangeUsers = new CanMangeAdmin();
    const communityAdminsAuth = new CommunityAdminAuth([canMangeUsers]);

    const checkUserIsAllowed = communityAdminsAuth.check({ userId, admins });
    if (!checkUserIsAllowed) {
      throw new ApiError("You are not authorized to add admins", 403);
    }

    const perms = normalizePermissions(permissions) as Permission[];

    const admin = await this.repo.create(community.id, userAdmin, perms);
    const [notification] = await NotificationService.promotedToAdmin(
      userAdmin,
      community.name
    );

    return { admin, notification };
  }

  async updateMessage(
    userAdmin: number,
    userId: number,
    communityId: number,
    permissions: Permission[]
  ) {
    const authUser = new AuthenticationUser();
    const user = new CommunityAdminAuth([authUser]);
    const ok = user.check({ userId });
    if (!ok) {
      throw new ApiError("Un Authentication", 401);
    }

    const community = await this.repo.findByIdCommunity(communityId);
    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const existAdmin = await this.repo.findAdmin(community.id, userAdmin);
    if (!existAdmin) {
      throw new ApiError("This user is not an admin in this community", 400);
    }

    const admins = await this.repo.getAdmins(community.id);
    const canMangeUsers = new CanMangeAdmin();
    const communityAdminsAuth = new CommunityAdminAuth([canMangeUsers]);

    const checkUserIsAllowed = communityAdminsAuth.check({ userId, admins });
    if (!checkUserIsAllowed) {
      throw new ApiError("You are not authorized to update admins", 403);
    }

    const perms = normalizePermissions(permissions) as Permission[];

    const updatedAdmin = await this.repo.update(community.id, userAdmin, perms);
    const [notification] = await NotificationService.updatedAdminPermissions(
      userAdmin,
      community.name
    );

    return { updatedAdmin, notification };
  }

  async deletedAdmin(userId: number, userAdmin: number, communityId: number) {
    const authUser = new AuthenticationUser();
    const user = new CommunityAdminAuth([authUser]);
    const ok = user.check({ userId });
    if (!ok) {
      throw new ApiError("Un Authentication", 401);
    }

    const community = await this.repo.findByIdCommunity(communityId);
    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const existAdmin = await this.repo.findAdmin(community.id, userAdmin);
    if (!existAdmin) {
      throw new ApiError("This user is not an admin in this community", 400);
    }

    const admins = await this.repo.getAdmins(community.id);
    const canMangeUsers = new CanMangeAdmin();
    const communityAdminsAuth = new CommunityAdminAuth([canMangeUsers]);

    const checkUserIsAllowed = communityAdminsAuth.check({ userId, admins });
    if (!checkUserIsAllowed) {
      throw new ApiError("You are not authorized to delete admins", 403);
    }

    await this.repo.deleteAdmin(community.id, userAdmin);

    const [notification] = await NotificationService.demotedFromAdmin(
      userAdmin,
      community.name
    );

    return { notification };
  }
}
