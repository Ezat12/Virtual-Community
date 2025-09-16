import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";

export const messagePrivateSchema = pgTable("message_private", {
  id: serial().primaryKey(),
  senderId: integer("sender_id")
    .references(() => usersSchema.id, { onDelete: "cascade" })
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => usersSchema.id, { onDelete: "cascade" })
    .notNull(),
  content: varchar("content", { length: 150 }).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});
