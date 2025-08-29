import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";
import { communitiesSchema } from "./communities";

export const communityMembershipsSchema = pgTable("community_memberships", {
  id: serial(),
  userId: integer("user_id").references(() => usersSchema.id, {
    onDelete: "cascade",
  }),
  communityId: integer("community_id").references(() => communitiesSchema.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),

  removedAt: timestamp("removed_at"),
  removedBy: integer("removed_by").references(() => usersSchema.id, {
    onDelete: "set null",
  }),
});
