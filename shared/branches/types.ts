import { z } from "zod";

export const peripheralSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  description: z.string().optional(),
});

export type Peripheral = z.infer<typeof peripheralSchema>;

export const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  category: z.enum(["cpu", "gpu", "ram", "storage", "monitor", "other"]),
});

export type Component = z.infer<typeof componentSchema>;

export const tariffSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  duration: z.number(),
  description: z.string().optional(),
  priceWeekday: z.number(),
  priceWeekend: z.number(),
  availableFrom: z.number().optional(),
  availableTo: z.number().optional(),
  perMinute: z.boolean().default(false),
  displayOnly: z.boolean().default(false),
});

export type Tariff = z.infer<typeof tariffSchema>;

export const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  seats: z.number().optional(),
  tariffs: z.array(tariffSchema),
  peripherals: z.array(peripheralSchema).optional(),
  components: z.array(componentSchema).optional(),
});

export type Zone = z.infer<typeof zoneSchema>;

export const branchConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  color: z.string(),
  colorClass: z.string(),
  accentColor: z.string().optional(),
  isActive: z.boolean().default(true),
  zones: z.array(zoneSchema),
});

export type BranchConfig = z.infer<typeof branchConfigSchema>;
