
import { z } from "zod";

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Nama kategori wajib diisi")
        .max(100, "Nama kategori maksimal 100 karakter"),

    description: z
        .string()
        .optional(),
});

export const updateCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Nama kategori wajib diisi")
        .max(100, "Nama kategori maksimal 100 karakter")
        .optional(),

    description: z
        .string()
        .optional(),
});
