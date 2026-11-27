import { z } from "zod";

export const createPaymentSchema = z.object({
    paymentType: z.enum(["DP", "FULL", "REMAINING"], {
        message: "Jenis pembayaran tidak valid",
    }),
});
