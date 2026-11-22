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
    
} 