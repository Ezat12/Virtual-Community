import { z } from "zod";

const permissionsEnumZod = z.enum([
  "manage_users",
  "edit_settings",
  "manage_posts",
]);

export const communityAdminSchemaValidation = z.object({
  userId: z.number("User id is required").int().positive(),
  communityId: z.number("Community id is required").int().positive(),
  permissions: z.array(permissionsEnumZod).optional(),
});
