import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const UserRole = pgEnum("role_user", ["user", "admin"]);

export const usersSchema = pgTable("users", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 100 }).notNull().unique(),
  password: varchar({ length: 100 }).notNull(),
  role: UserRole().default("user").notNull(),
  avatarUrl: varchar("avatar_url", { length: 250 }),
  bio: text(),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
