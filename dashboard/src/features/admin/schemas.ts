import { z } from "zod";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Ethereum EOA address.");

const optionalAddressSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^0x[a-fA-F0-9]{40}$/.test(value),
    "Enter a valid Ethereum address or leave this blank."
  );

const uintStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter a non-negative integer bitmask.");

export const adminSchema = z.object({
  principal: addressSchema,
  attributes: uintStringSchema,
  target: optionalAddressSchema,
  requiredMask: uintStringSchema,
  mode: z.enum(["A", "B"]),
  status: z.boolean(),
});

export type AdminFormValues = z.infer<typeof adminSchema>;
