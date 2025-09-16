import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";
import { communitiesSchema } from "./communities";

export const messageCommunitySchema = pgTable(
  "message_community",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .references(() => usersSchema.id, { onDelete: "cascade" })
      .notNull(),
    communityId: integer("community_id")
      .references(() => communitiesSchema.id, { onDelete: "cascade" })
      .notNull(),
    content: varchar("content", { length: 150 }).notNull(),
    isEdited: boolean("is_edited").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    senderIdx: index("message_community_sender_idx").on(table.senderId),
    communityIdx: index("message_community_community_idx").on(
      table.communityId
    ),
  })
);
