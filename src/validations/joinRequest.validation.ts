import { z } from "zod";

export const joinRequestValidation = z.object({
  communityId: z
    .string({ error: "Community id is required" })
    .nonempty({ error: "Community id is required" }),
  userId: z
    .string({ error: "User id is required" })
    .nonempty({ error: "User id is required" }),
});
