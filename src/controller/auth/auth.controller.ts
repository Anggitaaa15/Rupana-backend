import { Request, Response } from "express";
import { db } from "../../config/db";
import { usersTable } from "../../config/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "../../validations/auth.validation";
import jwt from "jsonwebtoken";

export class AuthController {

    // REGISTER
    static register = async (req: Request, res: Response) => {
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


    // LOGIN
    static login = async (req: Request, res: Response) => {
        try {
            // Validasi data login
            const validatedData = loginSchema.safeParse(req.body);

            if (!validatedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validatedData.error.flatten().fieldErrors,
                });
            }

            const { email, password } = validatedData.data;

            // Cari user berdasarkan email
            const [user] = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.email, email));

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Email atau password salah",
                });
            }

            // Cocokkan password
            const isPasswordValid = await bcrypt.compare(
                password,
                user.password
            );

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Email atau password salah",
                });
            }

            // Periksa JWT Secret
            const jwtSecret = process.env.JWT_SECRET;

            if (!jwtSecret) {
                throw new Error("JWT_SECRET belum dikonfigurasi");
            }

            // Buat JWT
            const token = jwt.sign(
                {
                    userId: user.id,
                    role: user.role,
                },
                jwtSecret,
                {
                    expiresIn: "1d",
                }
            );

            return res.status(200).json({
                success: true,
                message: "Login berhasil",
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                    token,
                },
            });

        } catch (error) {
            console.error("Login error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    };


}
