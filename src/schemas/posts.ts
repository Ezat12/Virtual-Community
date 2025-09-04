import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { communitiesSchema } from "./communities";
import { usersSchema } from "./usersSchema";

export const postTypeEnum = pgEnum("post_type", [
  "text",
  "image",
  "video",
  "mixed",
]);

export const postsSchema = pgTable("posts", {
  id: serial().primaryKey(),
  communityId: integer("community_id")
    .references(() => communitiesSchema.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => usersSchema.id, { onDelete: "cascade" })
    .notNull(),
  content: text(),
  type: postTypeEnum().notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow(),
  updateAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
