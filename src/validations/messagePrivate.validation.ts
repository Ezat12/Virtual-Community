import z from "zod";

export const sendMessagePrivateValidation = z.object({
  receiverId: z.number({ error: "Receiver id must be required" }),
  // .nonempty({ error: "Receiver id must be required" }),
  content: z
    .string({ error: "Content must be required" })
    .nonempty("Content must be required")
    .max(500, { message: "Content must be at most 500 characters" }),
});

export const updateMessagePrivateValidation = z.object({
  content: z
    .string({ error: "Content must be required" })
    .nonempty("Content must be required")
    .max(500, { message: "Content must be at most 500 characters" }),
});
