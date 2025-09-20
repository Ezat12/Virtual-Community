import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";

export const messagePrivateSchema = pgTable(
  "message_private",
  {
    id: serial().primaryKey(),
    senderId: integer("sender_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),
    receiverId: integer("receiver_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),
    content: varchar("content", { length: 500 }).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    senderIdx: index("sender_idx").on(table.senderId),
    receiverIdx: index("receiver_idx").on(table.receiverId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    senderReceiverIdx: index("sender_receiver_idx").on(
      table.senderId,
      table.receiverId
    ),
  })
);
