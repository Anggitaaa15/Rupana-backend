import { z } from "zod";

// Mengubah input kosong menjadi undefined
const optionalNumber = z.preprocess(
    (value) => {
        if (value === "" || value === null || value === undefined) {
            return undefined;
        }

        return value;
    },
    z.coerce.number().int().positive().optional()
);
const optionalText = z.string().trim().optional();

export const createOrderSchema = z.object({
    orderType: z.enum(["CATALOG", "CUSTOM"]),

    deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),

    shippingAddress: optionalText,

    // CUSTOM wajib mengisi nama furniture.
    // CATALOG mengambil nama dari produk.
    furnitureName: z.string().trim().optional(),

    productId: optionalNumber,

    categoryId: optionalNumber,

    width: optionalNumber,
    height: optionalNumber,
    length: optionalNumber,

    material: optionalText,
    finishing: optionalText,
    color: optionalText,

    quantity: z.coerce.number({
    error: "Jumlah wajib diisi",
    })
        .int("Jumlah harus berupa bilangan bulat")
        .positive("Jumlah minimal 1"),

    notes: optionalText,
    
}).superRefine((data, ctx) => {

    // Alamat wajib jika menggunakan DELIVERY
    if (
        data.deliveryMethod === "DELIVERY" &&
        !data.shippingAddress?.trim()
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["shippingAddress"],
            message: "Alamat pengiriman wajib diisi",
        });
    }

    // Validasi CATALOG
    if (data.orderType === "CATALOG") {
        if (!data.productId) {
            ctx.addIssue({
                code: "custom",
                path: ["productId"],
                message: "Produk katalog wajib dipilih",
            });
        }

        if (data.categoryId) {
            ctx.addIssue({
                code: "custom",
                path: ["categoryId"],
                message: "Kategori katalog diambil dari produk",
            });
        }
    }

    // Validasi CUSTOM
    if (data.orderType === "CUSTOM") {
        if (data.productId) {
            ctx.addIssue({
                code: "custom",
                path: ["productId"],
                message: "Pesanan custom tidak menggunakan produk katalog",
            });
        }

        if (!data.furnitureName?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["furnitureName"],
                message: "Nama furniture wajib diisi",
            });
        }

        if (!data.categoryId) {
            ctx.addIssue({
                code: "custom",
                path: ["categoryId"],
                message: "Kategori furniture wajib dipilih",
            });
        }

        if (!data.width) {
            ctx.addIssue({
                code: "custom",
                path: ["width"],
                message: "Lebar furniture wajib diisi",
            });
        }

        if (!data.height) {
            ctx.addIssue({
                code: "custom",
                path: ["height"],
                message: "Tinggi furniture wajib diisi",
            });
        }

        if (!data.length) {
            ctx.addIssue({
                code: "custom",
                path: ["length"],
                message: "Panjang furniture wajib diisi",
            });
        }

        if (!data.material?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["material"],
                message: "Material wajib diisi",
            });
        }

        if (!data.finishing?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["finishing"],
                message: "Finishing wajib diisi",
            });
        }

        if (!data.color?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["color"],
                message: "Warna furniture wajib diisi",
            });
        }
    }
});
