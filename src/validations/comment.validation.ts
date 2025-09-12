import z from "zod";

export const validationAddComment = z.object({
  content: z
    .string("content is required")
    .min(2, "content must be more than 2 char")
    .max(100, "content must be belong to 100 char"),
});
