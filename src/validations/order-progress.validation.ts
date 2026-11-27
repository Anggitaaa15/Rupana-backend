import { z } from "zod";

export const createOrderProgressSchema = z.object({
    status: z.enum(["IN_PRODUCTION", "READY_TO_SHIP"], {
        message: "Status progres tidak valid",
    }),
    description: z.string().optional(),
});