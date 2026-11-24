import { z } from "zod";

export const updateOrderSchema = z.object({
    agreedPrice: z.coerce.number()
        .int()
        .positive("Harga harus lebih dari 0"),

    estimatedDays: z.coerce.number()
        .int()
        .positive("Estimasi pengerjaan minimal 1 hari"),

    adminNotes: z.string().trim().optional(),
});
