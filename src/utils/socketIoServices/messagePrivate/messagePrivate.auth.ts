export interface AuthContext_MP {
  senderId?: number;
  userId?: number;
  receiverId?: number;
  isRead?: boolean;
}

interface RulesResult {
  ok: boolean;
  error?: string;
  code?: number;
}

export interface IRules_MP {
  check(ctx: AuthContext_MP): RulesResult;
}

export class CanSend implements IRules_MP {
  check(ctx: AuthContext_MP): RulesResult {
    if (ctx.receiverId === ctx.senderId) {
      return { ok: false, error: "Cannot send message to yourself", code: 403 };
    }

    return { ok: true };
  }
}

export class CanUpdate implements IRules_MP {
  check(ctx: AuthContext_MP): RulesResult {
    if (ctx.senderId !== ctx.userId) {
      return {
        ok: false,
        error: "You are not allowed to update this message",
        code: 403,
      };
    }
    return { ok: true };
  }
}

export class CanDelete implements IRules_MP {
  check(ctx: AuthContext_MP): RulesResult {
    if (ctx.senderId !== ctx.userId) {
      return {
        ok: false,
        error: "You are not allowed to delete this message",
        code: 403,
      };
    }
    return { ok: true };
  }
}

export class IsRead implements IRules_MP {
  check(ctx: AuthContext_MP): RulesResult {
    if (ctx.isRead) {
      return {
        ok: false,
        error: "You cannot edit this message because it has already been read",
        code: 403,
      };
    }
    return { ok: true };
  }
}

export class MessagePrivateAuthorization {
  constructor(private rules: IRules_MP[]) {}

  check(ctx: AuthContext_MP): RulesResult {
    for (const rule of this.rules) {
      const result = rule.check(ctx);
      if (!result.ok) return result;
    }
    return { ok: true };
  }
}
