import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        userId: number;
        role: "CUSTOMER" | "ADMIN" | "CRAFTSMAN";
    };
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Sesi habis, silakan login kembali",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET belum dikonfigurasi");
        }

        const decoded = jwt.verify(token, jwtSecret) as {
            userId: number;
            role: "CUSTOMER" | "ADMIN" | "CRAFTSMAN";
        };

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Token tidak valid",
        });
    }
};