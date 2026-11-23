import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/auth.routes"
import profileRoutes from "./routes/profile/profile.routes"
import categoryRoutes from "./routes/category/category.routes";
import furnitureRoutes from "./routes/product-furniture/furniture.routes"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/furniture", furnitureRoutes);

// Route utama
app.get("/", (_req, res) => {
    res.send("Rupana API berhasil berjalan");
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
