import { z } from "zod";

export const postValidationSchema = z.object({
  content: z.string().max(600).optional(),
  type: z.enum(["text", "image", "video"]).default("text"),
  media: z.array(
    z
      .object({
        url: z.string().url(),
        type: z.enum(["image", "video"]),
        order: z.number().min(1),
      })
      .optional()
  ),
});
