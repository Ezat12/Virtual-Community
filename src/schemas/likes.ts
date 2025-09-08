import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { postsSchema } from "./posts";
import { usersSchema } from "./usersSchema";

export const reactionsEnum = pgEnum("reaction_like", [
  "like",
  "love",
  "haha",
  "wow",
  "sad",
  "angry",
]);

export const likesSchema = pgTable("likes", {
  id: serial().primaryKey(),
  postId: integer("post_id")
    .references(() => postsSchema.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => usersSchema.id, {
    onDelete: "cascade",
  }),
  // commentId : integer("comment_id").references()
  createdAt: timestamp("created_at").defaultNow(),
  reactions: reactionsEnum().default("like").notNull(),
});
