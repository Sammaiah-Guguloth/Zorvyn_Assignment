import { z } from "zod";
import { ROLES } from "../utils/constants.util.js";

// Validation schema for login
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email format"),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters"),
  }),
});

// Validation schema for change password
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string({ required_error: "Current password is required" }),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "Password must be at least 8 characters"),
  }),
});

// Validation schema for creating user
export const createUserSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email format"),
    role: z.enum(Object.values(ROLES), {
      required_error: "Role is required",
      invalid_type_error: "Invalid role",
    }),
  }),
});
