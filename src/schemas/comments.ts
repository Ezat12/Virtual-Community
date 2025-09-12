import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { postsSchema } from "./posts";
import { usersSchema } from "./usersSchema";

export const commentsSchema = pgTable("comments", {
  id: serial().primaryKey(),
  postId: integer("post_id")
    .references(() => postsSchema.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => usersSchema.id, { onDelete: "cascade" })
    .notNull(),
  referenceId: integer("reference_id").references((): any => commentsSchema.id),
  content: varchar("content", { length: 100 }).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// export const commentsRelation = relations(commentsSchema, ({ one, many }) => ({
//   parent: one(commentsSchema, {
//     fields: [commentsSchema.referenceId],
//     references: [commentsSchema.id],
//   }),
//   replies: many(commentsSchema),
// }));
