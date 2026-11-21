
import { z } from "zod";

// REGISTER VALIDATION
export const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Nama minimal 3 karakter")
        .max(100, "Nama maksimal 100 karakter"),

    email: z
        .string()
        .email("Format email tidak valid")
        .max(100, "Email maksimal 100 karakter"),

    password: z
        .string()
        .min(8, "Password minimal 8 karakter"),

    confirmPassword: z
        .string()
        .min(8, "Konfirmasi password minimal 8 karakter"),
    }).refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
});

// LOGIN VALIDATION
export const loginSchema = z.object({
    email: z
        .string()
        .email("Format email tidak valid"),

    password: z
        .string()
        .min(8, "Password minimal 8 karakter"),
});
