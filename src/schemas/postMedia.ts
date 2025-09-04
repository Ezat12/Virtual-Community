import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { postsSchema } from "./posts";

export const postMediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const postMediaSchema = pgTable("post_media", {
  id: serial().primaryKey(),
  postId: integer("post_id")
    .references(() => postsSchema.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: postMediaTypeEnum().notNull(),
  order: integer().notNull().default(1),
  url: varchar("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
