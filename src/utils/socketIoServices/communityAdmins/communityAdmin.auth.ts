import { InferSelectModel } from "drizzle-orm";
import { communityAdminsSchema } from "../../../schemas";

export type communityAdmin = InferSelectModel<typeof communityAdminsSchema>;

interface AuthContext_cAdmin {
  userId?: number;
  admins?: communityAdmin[];
  createdBy?: number;
}

interface IRules_CAdmin {
  check(ctx: AuthContext_cAdmin): boolean;
}

export class AuthenticationUser implements IRules_CAdmin {
  check(ctx: AuthContext_cAdmin): boolean {
    return !!ctx.userId;
  }
}

export class CanMangeAdmin implements IRules_CAdmin {
  check(ctx: AuthContext_cAdmin): boolean {
    const checkUserIsAllowed = ctx.admins?.some(
      (admin) =>
        admin.userId === ctx.userId &&
        admin.permissions.includes("manage_users")
    );
    if (ctx.createdBy === ctx.userId || checkUserIsAllowed) {
      return true;
    }

    return false;
  }
}

export class CommunityAdminAuth {
  constructor(private rules: IRules_CAdmin[]) {}

  check(ctx: AuthContext_cAdmin) {
    for (let rule of this.rules) {
      const ok = rule.check(ctx);
      if (!ok) return false;
    }

    return true;
  }
}
