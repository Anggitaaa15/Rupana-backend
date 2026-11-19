
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export default defineConfig({
    schema: "./src/config/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
        ssl: {
            ca: fs.readFileSync(
                path.join(process.cwd(), "certs", "ca.pem")
            ).toString(),
            rejectUnauthorized: true,
        },
    },
});
