import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./config/db";
import pool from "./config/db";

const testMigration = async () => {
    try {
        await migrate(db, {
            migrationsFolder: "./drizzle",
        });

        console.log("Migration berhasil diterapkan!");
    } catch (error) {
        console.error("Migration gagal:");
        console.dir(error, { depth: null });
    } finally {
        await pool.end();
    }
};

testMigration();
