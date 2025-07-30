import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersSchema } from "./usersSchema";

export const emailVerifications = pgTable("email_verifications", {
  id: serial().primaryKey(),
  userId: integer().references(() => usersSchema.id, { onDelete: "cascade" }),
  code: text().notNull(),
  expired_at: timestamp().notNull(),
  used: boolean().default(false),
  createdAt: timestamp().defaultNow(),
});
