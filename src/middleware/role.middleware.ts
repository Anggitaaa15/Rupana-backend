import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

type UserRole = "CUSTOMER" | "ADMIN" | "CRAFTSMAN";

export const authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Silakan login terlebih dahulu",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses",
            });
        }

        next();
    };
};