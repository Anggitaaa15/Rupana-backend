import { Request, Response } from "express";
import { createProductSchema } from "../../validations/product.validation";
import { db } from "../../config/db";
import { categoriesTable, productsTable } from "../../config/schema";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { deleteFromCloudinary, uploadToCloudinary } from "../../service/cloudinary.service";

export class ProductController {

    // CREATE
    static async createProduct (req: Request, res: Response) {
        let uploadedPublicId: string | null = null;

        try {
            // Validasi
            const validation = createProductSchema.safeParse(req.body)

            if(!validation.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validation.error.flatten().fieldErrors
                });
            };

            // Validasi gambar
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Foto produk wajib diunggah",
                });
            };

            const file = req.file;

            const data = validation.data

            // Cek kategori
            const [category] = await db
                .select()
                .from(categoriesTable)
                .where(eq(categoriesTable.id, data.categoryId))

            if(!category) {
                return res.status(404).json({
                    success: false, 
                    message: "Kategori tidak ditemukan"
                });
            };

            // Upload gambar ke cloudinary
            const uploadedImage = await uploadToCloudinary(
                file.buffer
            );

             uploadedPublicId = uploadedImage.public_id;

            // Simpan produk ke database
            const [newProduct] = await db
                .insert(productsTable)
                .values({
                    ...data,
                    imageUrl: uploadedImage.secure_url,
                    imagePublicId: uploadedImage.public_id,
                })
                .returning();

            return res.status(201).json({
                success: true,
                message: "Produk berhasil ditambahkan",
                data: newProduct,
            });

        } catch (error) {
            // Hapus gambar jika penyimpanan database gagal
            if (uploadedPublicId) {
                await deleteFromCloudinary(uploadedPublicId)
                    .catch((deleteError) => {
                        console.error("Delete Cloudinary error:", deleteError);
                    });
            }

            console.error("Create product error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    }

    // GET ALL PRODUCTS
    static async getAllProducts(req: Request, res: Response) {
        try {
            const products = await db
                .select({
                    ...getTableColumns(productsTable),
                    categoryName: categoriesTable.name,
                })
                .from(productsTable)
                .leftJoin(
                    categoriesTable,
                    eq(productsTable.categoryId, categoriesTable.id)
                )
                .orderBy(desc(productsTable.createdAt));

            return res.status(200).json({
                success: true,
                message: "Data produk berhasil diambil",
                data: products,
            });

        } catch (error) {
            console.error("Get all products error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    }

}