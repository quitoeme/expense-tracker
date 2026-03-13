import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  display_name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  currency: z.string().default("ARS"),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const splitEntrySchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
});

export const expenseSchema = z.object({
  description: z.string().min(1, "Descripción requerida"),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  date: z.string(),
  category_id: z.string().uuid().optional().nullable(),
  paid_by: z.string().uuid(),
  split_method: z.enum(["equal", "percentage", "fixed"]),
  splits: z.array(splitEntrySchema).min(1, "Al menos un participante"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SplitEntry = z.infer<typeof splitEntrySchema>;
