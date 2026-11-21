import { Request, Response } from "express";
import { db } from "../../config/db";
import { usersTable } from "../../config/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { registerSchema } from "../../validations/auth.validation";

export class AuthController {

    // REGISTER
    register = async (req: Request, res: Response) => {
        try {
            // Validasi data register
            const validatedData = registerSchema.safeParse(req.body);

            if (!validatedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validatedData.error.flatten().fieldErrors,
                });
            }

            const { username, email, password } = validatedData.data;

            // Cek email sudah terdaftar
            const existingEmail = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.email, email));

            if (existingEmail.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email sudah terdaftar",
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Simpan data user
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
                success: true,
                message: "Registrasi berhasil",
                data: newUser,
            });

        } catch (error) {
            console.error("Register error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    };

}
