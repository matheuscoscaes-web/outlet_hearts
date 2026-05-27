import { z } from "zod";

export const createReservationSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  clientToken: z.string().min(1),
});

export const createOrderSchema = z.object({
  reservationId: z.string().min(1),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  shortDescription: z.string().min(3).max(150),
  description: z.string().min(3),
  category: z.string().min(1),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "STOCK_END", "UNIQUE_PIECE"]).default("NEW"),
  originalPrice: z.number().positive(),
  outletPrice: z.number().positive(),
  quantity: z.number().int().min(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateStockSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "Delta não pode ser zero"),
  reason: z.string().min(3).max(200),
  note: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
