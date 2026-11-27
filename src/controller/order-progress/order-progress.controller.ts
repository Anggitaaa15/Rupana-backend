import { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { orderProgressTable, ordersTable } from "../../config/schema";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createOrderProgressSchema } from "../../validations/order-progress.validation";
import { deleteFromCloudinary, uploadToCloudinary } from "../../service/cloudinary.service";

export class OrderProgressController {

    // Membuat progres pengerjaan oleh pengrajin
    static async createProgress(req: AuthRequest, res: Response) {
        let uploadedPublicId: string | null = null;

        try {
            // Mengambil ID pengrajin dari token
            const userId = req.user?.userId;

            // Mengambil ID pesanan dari URL
            const orderId = Number(req.params.orderId);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Sesi login tidak valid",
                });
            }

            if (!Number.isSafeInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID pesanan tidak valid",
                });
            }

            // Validasi input
            const validation = createOrderProgressSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validation.error.flatten().fieldErrors,
                });
            }

            const { status, description } = validation.data;

            // Mencari pesanan
            const [order] = await db
                .select()
                .from(ordersTable)
                .where(eq(ordersTable.id, orderId))
                .limit(1);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Pesanan tidak ditemukan",
                });
            }

            // Memastikan status pengerjaan berurutan
            if (
                status === "IN_PRODUCTION" &&
                order.status !== "DP_PAID" &&
                order.status !== "PAID"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan belum dibayar atau sudah mulai diproduksi",
                });
            }

            if (
                status === "READY_TO_SHIP" &&
                order.status !== "IN_PRODUCTION"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan harus melalui tahap produksi terlebih dahulu",
                });
            }

            // Foto wajib ketika furniture selesai diproduksi
            if (status === "READY_TO_SHIP" && !req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Foto furniture wajib diunggah",
                });
            }

            // Upload foto jika tersedia
            let imageUrl: string | null = null;

            if (req.file) {
                const uploadedImage = await uploadToCloudinary(
                    req.file.buffer
                );

                imageUrl = uploadedImage.secure_url;
                uploadedPublicId = uploadedImage.public_id;
            }

            // Menyimpan progres dan memperbarui status pesanan
            const progress = await db.transaction(async (tx) => {
                await tx
                    .update(ordersTable)
                    .set({
                        status,
                        updatedAt: new Date(),
                    })
                    .where(eq(ordersTable.id, orderId));

                const [newProgress] = await tx
                    .insert(orderProgressTable)
                    .values({
                        orderId,
                        updatedBy: userId,
                        status,
                        description,
                        imageUrl,
                    })
                    .returning();

                return newProgress;
            });

            return res.status(201).json({
                success: true,
                message: "Progres pesanan berhasil diperbarui",
                data: progress,
            });

        } catch (error) {
            // Menghapus foto dari Cloudinary jika penyimpanan gagal
            if (uploadedPublicId) {
                try {
                    await deleteFromCloudinary(uploadedPublicId);
                } catch (deleteError) {
                    console.error("Gagal menghapus foto:", deleteError);
                }
            }

            console.error("Create progress error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    }


    // Melihat riwayat progres pesanan
    static async getProgressByOrder(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const role = req.user?.role;
            const orderId = Number(req.params.orderId);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Sesi login tidak valid",
                });
            }

            if (!Number.isSafeInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID pesanan tidak valid",
                });
            }

            // Mencari pesanan
            const [order] = await db
                .select()
                .from(ordersTable)
                .where(eq(ordersTable.id, orderId))
                .limit(1);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Pesanan tidak ditemukan",
                });
            }

            // CUSTOMER hanya boleh melihat pesanan miliknya
            if (role === "CUSTOMER" && order.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Kamu tidak memiliki akses ke pesanan ini",
                });
            }

            // Mengambil riwayat progres
            const progress = await db
                .select({
                    id: orderProgressTable.id,
                    orderId: orderProgressTable.orderId,
                    status: orderProgressTable.status,
                    description: orderProgressTable.description,
                    imageUrl: orderProgressTable.imageUrl,
                    createdAt: orderProgressTable.createdAt,
                })
                .from(orderProgressTable)
                .where(eq(orderProgressTable.orderId, orderId))
                .orderBy(orderProgressTable.createdAt);

            return res.status(200).json({
                success: true,
                message: "Riwayat progres berhasil diambil",
                data: progress,
            });

        } catch (error) {
            console.error("Get progress error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server",
            });
        }
    }
}