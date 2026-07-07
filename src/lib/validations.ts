import { z } from "zod";
import { isValidCPF } from "./utils";

export const createReservationSchema = z.object({
  productId: z.string().min(1),
  color: z.string().optional(),
  quantity: z.number().int().min(1).max(10),
  clientToken: z.string().min(1),
});

export const createOrderSchema = z
  .object({
    reservationId: z.string().min(1),
    customerName: z.string().min(2).max(100),
    customerEmail: z.string().email(),
    customerPhone: z.string().optional(),
    customerCpf: z.string().refine(isValidCPF, "CPF inválido"),
    deliveryMethod: z.enum(["SHIPPING", "PICKUP"]).default("SHIPPING"),
    shippingCep: z
      .string()
      .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
      .optional(),
    shippingStreet: z.string().min(2, "Endereço obrigatório").max(200).optional(),
    shippingNumber: z.string().min(1, "Número obrigatório").max(20).optional(),
    shippingComplement: z.string().max(100).optional(),
    shippingNeighborhood: z.string().min(2, "Bairro obrigatório").max(100).optional(),
    shippingCity: z.string().min(2, "Cidade obrigatória").max(100).optional(),
    shippingState: z.string().length(2, "UF inválida").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod !== "SHIPPING") return;
    const required: [keyof typeof data, string][] = [
      ["shippingCep", "CEP obrigatório"],
      ["shippingStreet", "Endereço obrigatório"],
      ["shippingNumber", "Número obrigatório"],
      ["shippingNeighborhood", "Bairro obrigatório"],
      ["shippingCity", "Cidade obrigatória"],
      ["shippingState", "UF obrigatória"],
    ];
    for (const [field, message] of required) {
      if (!data[field]) {
        ctx.addIssue({ code: "custom", path: [field], message });
      }
    }
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
  sizes: z.array(z.string().min(1)).default([]),
  colors: z.array(z.string().min(1)).default([]),
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
