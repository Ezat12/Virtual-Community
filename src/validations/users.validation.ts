import { z } from "zod";

export const validationRegisterUserSchema = z.object({
  name: z
    .string("Name is required")
    .nonempty("Name is required")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string("email is required")
    .nonempty("Email is required")
    .email("Invalid email format")
    .max(100, "Email must be at most 100 characters"),
  password: z
    .string("Password is required")
    .nonempty("Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must be at most 50 characters"),
  role: z.enum(["user", "admin"]).default("user").optional(),
  avatarUrl: z
    .string()
    .max(250, "Avatar URL must be at most 250 characters")
    .optional(),
  bio: z.string().optional(),
  emailVerified: z.boolean().default(false).optional(),
});
