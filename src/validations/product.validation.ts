import { z } from "zod";

// CREATE PRODUCT
export const createProductSchema = z.object({
    categoryId: z.coerce.number()
        .int("Kategori tidak valid")
        .positive("Kategori wajib dipilih"),

    name: z.string()
        .min(1, "Nama furniture wajib diisi")
        .max(150, "Nama furniture maksimal 150 karakter"),

    description: z.string()
    .min(1, "Deskripsi produk wajib diisi"),

    basePrice: z.coerce.number()
        .int("Harga harus berupa bilangan bulat")
        .positive("Harga harus lebih dari 0"),

    defaultMaterial: z.string().optional(),

    width: z.coerce.number()
        .int()
        .positive()
        .optional(),

    height: z.coerce.number()
        .int()
        .positive()
        .optional(),

    length: z.coerce.number()
        .int()
        .positive()
        .optional(),
});

// UPDATE PRODUCT
export const updateProductSchema = z.object({
    categoryId: z.coerce.number()
        .int()
        .positive()
        .optional(),

    name: z.string()
        .min(1, "Nama furniture wajib diisi")
        .max(150, "Nama furniture maksimal 150 karakter")
        .optional(),

    description: z.string()
        .min(1, "Deskripsi produk wajib diisi")
        .optional(),

    basePrice: z.coerce.number()
        .int()
        .positive()
        .optional(),

    defaultMaterial: z.string().optional(),

    width: z.coerce.number()
        .int()
        .positive()
        .optional(),

    height: z.coerce.number()
        .int()
        .positive()
        .optional(),

    length: z.coerce.number()
        .int()
        .positive()
        .optional(),

    isAvailable: z.preprocess(
        (value) => {
            if (value === "true") return true;
            if (value === "false") return false;
            return value;
        },
        z.boolean().optional()
    ),
});
