import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";

export const typesNotificationEnum = pgEnum("types_notification", [
  "join_community",
  "reject_community",
  "your_admin",
  "remove_admin",
  "update_admin",
  "like",
  "like_comment",
  // "accept_post",
  // "reject_post",
  "comment",
  "mention",
]);

export const notificationSchema = pgTable(
  "notification",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),
    message: varchar("message", { length: 250 }).notNull(),
    type: typesNotificationEnum().notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("notification_user_idx").on(table.userId),
    readIdx: index("notification_read_idx").on(table.isRead),
  })
);
