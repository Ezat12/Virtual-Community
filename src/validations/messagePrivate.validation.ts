import z from "zod";

export const sendMessagePrivateValidation = z.object({
  receiverId: z
    .string({ error: "Receiver id must be required" })
    .nonempty({ error: "Receiver id must be required" }),
  content: z
    .string({ error: "Content must be required" })
    .nonempty("Content must be required")
    .max(150, { message: "Content must be at most 150 characters" }),
});
