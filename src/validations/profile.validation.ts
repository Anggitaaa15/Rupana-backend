
import { z } from "zod";

// UPDATE PROFILE VALIDATION
export const updateProfileSchema = z.object({
    username: z
        .string()
        .min(3, "Username minimal 3 karakter")
        .max(100, "Username maksimal 100 karakter")
        .optional(),

    email: z
        .string()
        .email("Format email tidak valid")
        .max(100, "Email maksimal 100 karakter")
        .optional(),

    phone: z
        .string()
        .max(20, "Nomor telepon maksimal 20 karakter")
        .nullable()
        .optional(),
}).refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
        message: "Minimal satu data profil harus diisi",
    }
);
