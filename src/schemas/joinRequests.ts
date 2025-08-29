import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { communitiesSchema } from "./communities";
import { usersSchema } from "./usersSchema";

export const statusEnum = pgEnum("status_member", [
  "pending",
  "accepted",
  "rejected",
]);

export const joinRequestSchema = pgTable("join_requests", {
  id: serial(),
  communityId: integer("community_id").references(() => communitiesSchema.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").references(() => usersSchema.id, {
    onDelete: "cascade",
  }),
  status: statusEnum().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
