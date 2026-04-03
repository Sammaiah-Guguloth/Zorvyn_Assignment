import { z } from "zod";
import { TRANSACTION_TYPES } from "../utils/constants.util.js";

// Validation schema for creating a record
export const createRecordSchema = z.object({
  body: z.object({
    amount: z.number({ required_error: "Amount is required" }).positive("Amount must be positive"),
    type: z.enum(Object.values(TRANSACTION_TYPES), {
      required_error: "Type is required",
      invalid_type_error: "Invalid type. Must be income or expense",
    }),
    category: z.string({ required_error: "Category is required" }).min(1, "Category cannot be empty"),
    date: z.string().datetime().optional().or(z.date().optional()),
    description: z.string().optional(),
  }),
});

// Validation schema for updating a record
export const updateRecordSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive").optional(),
    type: z.enum(Object.values(TRANSACTION_TYPES)).optional(),
    category: z.string().min(1, "Category cannot be empty").optional(),
    date: z.string().datetime().optional().or(z.date().optional()),
    description: z.string().optional(),
  }),
});
