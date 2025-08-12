import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";
import { communitiesSchema } from "./communities";

export const permissionsEnum = pgEnum("permissions", [
  "manage_users",
  "edit_settings",
  "manage_posts",
]);

export const communityAdminsSchema = pgTable(
  "community_admins",
  {
    id: serial(),
    userId: integer("user_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),

    communityId: integer("community_id")
      .references(() => communitiesSchema.id, { onDelete: "cascade" })
      .notNull(),

    permissions: permissionsEnum().default("manage_posts").array().notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.communityId, table.userId] }),
  })
);
