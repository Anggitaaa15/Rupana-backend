import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        ca: fs.readFileSync(
            path.join(process.cwd(), "certs", "ca.pem")
        ).toString(),
        rejectUnauthorized: true,
    },
});

export const db = drizzle(pool);
export default pool;
