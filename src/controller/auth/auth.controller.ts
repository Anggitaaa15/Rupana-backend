import { Request, Response } from "express";
import { usersTable } from "../../config/schema";
import { db } from "../../config/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registerSchema } from "../../validations/auth.validation";

// REGISTER
export const register = async (req: Request, res: Response) => {
    try {
        // Validasi data register
        const validation = registerSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { username, email, password } = validation.data;

        // Cek email sudah terdaftar
        const existingUser = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (existingUser.length > 0) {
            return res.status(409).json({
                message: "Email sudah terdaftar",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan user ke database
        const [newUser] = await db
            .insert(usersTable)
            .values({
                username,
                email,
                password: hashedPassword,
            })
            .returning({
                id: usersTable.id,
                username: usersTable.username,
                email: usersTable.email,
                role: usersTable.role,
            });

        return res.status(201).json({
            message: "Registrasi berhasil",
            data: newUser,
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan pada server",
        });
    }
};