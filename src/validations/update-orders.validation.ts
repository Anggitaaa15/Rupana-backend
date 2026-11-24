
import { z } from "zod";

export const updateOrderSchema = z.object({
    status: z.enum(["WAITING_PAYMENT", "REJECTED"], {
        message: "Status pesanan tidak valid",
    }),

    agreedPrice: z.coerce.number()
        .int()
        .positive("Harga harus lebih dari 0")
        .optional(),

    estimatedDays: z.coerce.number()
        .int()
        .positive("Estimasi pengerjaan minimal 1 hari")
        .optional(),

    adminNotes: z.string().trim().optional(),
}).superRefine((data, ctx) => {

    // Jika pesanan diterima
    if (data.status === "WAITING_PAYMENT") {
        if (data.agreedPrice === undefined) {
            ctx.addIssue({
                code: "custom",
                path: ["agreedPrice"],
                message: "Harga wajib diisi jika pesanan diterima",
            });
        }

        if (data.estimatedDays === undefined) {
            ctx.addIssue({
                code: "custom",
                path: ["estimatedDays"],
                message: "Estimasi pengerjaan wajib diisi",
            });
        }
    }

    // Jika pesanan ditolak
    if (data.status === "REJECTED") {
        if (!data.adminNotes) {
            ctx.addIssue({
                code: "custom",
                path: ["adminNotes"],
                message: "Alasan penolakan wajib diisi",
            });
        }
    }
});
