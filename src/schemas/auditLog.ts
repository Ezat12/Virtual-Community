import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { communitiesSchema } from "./communities";
import { usersSchema } from "./usersSchema";

export const actionsEnum = pgEnum("audit_log_actions", [
  "join",
  "leave",
  "remove",
  "accept",
  "reject",
]);

export const visibilityEnum = pgEnum("audit_log_visibility", [
  "public",
  "private",
]);

export const auditLogSchema = pgTable("audit_logs", {
  id: serial().primaryKey(),
  communityId: integer("community_id").references(() => communitiesSchema.id, {
    onDelete: "cascade",
  }),
  actorId: integer("actor_id").references(() => usersSchema.id, {
    onDelete: "set null",
  }),
  targetId: integer("target_id").references(() => usersSchema.id, {
    onDelete: "set null",
  }),
  action: actionsEnum().notNull(),
  visibility: visibilityEnum().default("public"),
  createdAt: timestamp("created_at").defaultNow(),
});
