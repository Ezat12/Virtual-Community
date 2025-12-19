import { IsAdminToManageUsers } from "../../../controllers/communityMembers.controller";

interface payload {
  communityId: number;
  userId: number;
  createdBy?: number;
}

interface IRules_CM {
  check(ctx: payload): boolean | Promise<boolean>;
}

export class IsOwner implements IRules_CM {
  check(ctx: payload): boolean | Promise<boolean> {
    return ctx.createdBy === ctx.userId;
  }
}

export class CanManageUsers implements IRules_CM {
  async check(ctx: payload): Promise<boolean> {
    const canManageUsers = await IsAdminToManageUsers(
      ctx.communityId,
      ctx.userId
    );

    return canManageUsers;
  }
}

export class CommunityMemberAuth {
  constructor(private rules: IRules_CM[]) {}

  async check(ctx: payload): Promise<boolean> {
    for (let rule of this.rules) {
      const ok = await rule.check(ctx);
      if (!ok) return false;
    }

    return true;
  }

  async checkAny(ctx: payload): Promise<boolean> {
    for (let rule of this.rules) {
      if (await rule.check(ctx)) return true;
    }
    return false;
  }
}
