import { z } from "zod";

export const sendMessageToCommunityValidation = z.object({
  communityId: z
    .string({ error: "Community id must be required in params" })
    .nonempty({ error: "Community id must be required in params" }),
  content: z
    .string({ error: "Content must be required" })
    .nonempty("Content must be required")
    .max(150, { message: "Content must be at most 150 characters" }),
});

export const updateMessageToCommunityValidation = z.object({
  content: z
    .string({ error: "Content must be required" })
    .nonempty("Content must be required")
    .max(150, { message: "Content must be at most 150 characters" })
    .optional(),
});
