import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";

export const privacyEnum = pgEnum("privacy_community", ["private", "public"]);

export const communitiesSchema = pgTable("communities", {
  id: serial().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 300 }),
  createdBy: integer("created_by").references(() => usersSchema.id, {
    onDelete: "set null",
  }),
  privacy: privacyEnum().default("public"),
  createdAt: timestamp("created_at").defaultNow(),
});
