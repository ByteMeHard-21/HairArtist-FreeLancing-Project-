import { z } from "zod";

export const menuServiceInput = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  audience: z.enum(["men", "women", "groom"]),
  price: z.number().int().min(0).max(200000),
  visible: z.boolean(),
}).strict();
export const menuServiceUpdate = menuServiceInput.extend({ id: z.string().min(1).max(100) });
