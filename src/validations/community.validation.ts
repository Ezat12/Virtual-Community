import z from "zod";

export const validationCreateCommunity = z.object({
  name: z
    .string("Name is required")
    .min(2, "Name must be more than 2 char")
    .max(100, "Name must be belong to 100 char"),
  description: z
    .string("Description is required")
    .min(10, "Description must be more than 10 char")
    .max(500, "Description must be belong to 500 char"),
  avatarUrl: z.string().optional(),
});
