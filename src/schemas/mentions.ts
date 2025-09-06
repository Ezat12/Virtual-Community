import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { postsSchema } from "./posts";
import { usersSchema } from "./usersSchema";

export const mentionsSchema = pgTable(
  "mentions",
  {
    id: serial(),
    postId: integer("post_id")
      .references(() => postsSchema.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: [table.postId, table.userId],
  })
);
