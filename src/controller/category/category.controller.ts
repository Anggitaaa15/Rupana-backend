import { Request, Response } from "express";
import { db } from "../../config/db";
import { categoriesTable } from "../../config/schema";
import { asc, eq } from "drizzle-orm";
import { success } from "zod";
import { createCategorySchema } from "../../validations/category.validation";

export class CategoryController {

    // CREATE
    static async createCategory (req: Request, res: Response) {
        
        const validation = createCategorySchema.safeParse(req.body)
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            })
        }

        const { name, description } = validation.data

        const [existingCategory] = await db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.name, name))

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Nama kategori sudah di gunakan"
            })
        }

        const [newCategory] = await db 
            .insert(categoriesTable)
            .values({
                name, 
                description: description ?? null
            })
            .returning()

        return res.status(200).json({
            success: true,
            message: "Kategori berhasil dibuat!",
            data: newCategory,
        })
    }

    // GET ALL
    static async getAll (req: Request, res: Response ) {
        try {
            const categories = await db
                .select()
                .from(categoriesTable)
                .orderBy(asc(categoriesTable.name));

            return res.status(200).json({
                success: true,
                message: "Data kategori berhasil di ambil",
                data: categories,
        })
        } catch (error) {
            console.log(error)

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data kategori"
            })
        }
    }

    // GET BY ID
    static async getById (req:Request, res: Response) {
        const id = Number(req.params.id)

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid"
            })
        }

        const [category] = await db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, id));

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan"
            })
        }

        return res.status(200).json({
            success: true,
            message: "Data kategori berhasil di ambil",
            data: category,
        })
    }
} 