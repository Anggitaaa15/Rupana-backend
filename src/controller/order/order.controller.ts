import { Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { ordersTable, orderDetailsTable, productsTable, categoriesTable,} from "../../config/schema";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createOrderSchema } from "../../validations/order.validation";
import { uploadToCloudinary, deleteFromCloudinary } from "../../service/cloudinary.service";
import { updateOrderSchema } from "../../validations/update-orders.validation";

export class OrdersController {

    // CREATE ORDER
    static async createOrders(req: AuthRequest, res: Response) {
        let uploadedPublicId: string | null = null;

        try {
            // 1. Memastikan customer sudah login
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Silakan login terlebih dahulu",
                });
            }

            const userId = req.user.userId;

            // 2. Validasi input menggunakan Zod
            const validation = createOrderSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validation.error.flatten().fieldErrors,
                });
            }

            const data = validation.data;

            // 3. Memastikan gambar CUSTOM diunggah
            if (data.orderType === "CUSTOM" && !req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Gambar referensi furniture wajib diunggah",
                });
            }

            let productId: number | null = null;
            let categoryId: number;
            let furnitureName: string;

            let width: number | null = data.width ?? null;
            let height: number | null = data.height ?? null;
            let length: number | null = data.length ?? null;

            let material: string | null = data.material ?? null;
            let isSizeCustomized = false;

            // 4. Mengambil data produk jika jenis CATALOG
            if (data.orderType === "CATALOG") {
                const [product] = await db
                    .select()
                    .from(productsTable)
                    .where(eq(productsTable.id, data.productId!))
                    .limit(1);

                if (!product) {
                    return res.status(404).json({
                        success: false,
                        message: "Produk tidak ditemukan",
                    });
                }

                if (!product.isAvailable) {
                    return res.status(400).json({
                        success: false,
                        message: "Produk sedang tidak tersedia",
                    });
                }

                productId = product.id;
                categoryId = product.categoryId;
                furnitureName = product.name;

                // Menggunakan ukuran default produk jika tidak diubah
                width = data.width ?? product.width;
                height = data.height ?? product.height;
                length = data.length ?? product.length;

                // Menggunakan material default produk jika tidak diubah
                material = data.material ?? product.defaultMaterial;

                // Mengecek apakah ukuran diubah customer
                isSizeCustomized =
                    (data.width !== undefined && data.width !== product.width) ||
                    (data.height !== undefined && data.height !== product.height) ||
                    (data.length !== undefined && data.length !== product.length);
            } else {
                // 5. Mengambil kategori jika jenis CUSTOM
                const [category] = await db
                    .select()
                    .from(categoriesTable)
                    .where(eq(categoriesTable.id, data.categoryId!))
                    .limit(1);

                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Kategori furniture tidak ditemukan",
                    });
                }

                furnitureName = data.furnitureName!;
                categoryId = category.id;
            }

            // 6. Upload gambar referensi CUSTOM ke Cloudinary
            let referenceImageUrl: string | null = null;

            if (data.orderType === "CUSTOM" && req.file) {
                const uploaded = await uploadToCloudinary(
                    req.file.buffer,
                    "rupana/order-references"
                );

                referenceImageUrl = uploaded.secure_url;
                uploadedPublicId = uploaded.public_id;
            }

            // 7. Simpan order dan detail dalam satu transaksi
            const result = await db.transaction(async (tx) => {

                const [newOrder] = await tx
                    .insert(ordersTable)
                    .values({
                        userId,
                        orderType: data.orderType,
                        status: "PENDING_REVIEW",
                        deliveryMethod: data.deliveryMethod,
                        shippingAddress:
                            data.shippingAddress?.trim() || null,
                    })
                    .returning();

                const [newDetail] = await tx
                    .insert(orderDetailsTable)
                    .values({
                        orderId: newOrder.id,
                        productId,
                        categoryId,
                        furnitureName,
                        orderType: data.orderType,

                        width,
                        height,
                        length,

                        isSizeCustomized,
                        material,
                        finishing: data.finishing ?? null,
                        color: data.color ?? null,

                        quantity: data.quantity,
                        agreedPrice: 0,

                        notes: data.notes?.trim() || null,

                        referenceImageUrl,
                        referenceImagePublicId: uploadedPublicId,
                    })
                    .returning();

                return {
                    order: newOrder,
                    detail: newDetail,
                };
            });

            // 8. Mengirim respons berhasil
            return res.status(201).json({
                success: true,
                message: "Pesanan berhasil dibuat dan menunggu pemeriksaan admin",
                data: result,
            });

        } catch (error) {

            // Menghapus gambar jika penyimpanan database gagal
            if (uploadedPublicId) {
                try {
                    await deleteFromCloudinary(uploadedPublicId);
                } catch (deleteError) {
                    console.error(
                        "Gagal menghapus gambar Cloudinary:",
                        deleteError
                    );
                }
            }

            console.error("Create order error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan saat membuat pesanan",
            });
        }
    }

    // GET ALL ORDER (ADMIN & CUSTOMER)
    static async getAllOrders(req: AuthRequest, res: Response) {
        try {

            if(!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Silakan login terlebih dahulu"
                })
            }

            const { userId, role } = req.user

            let orders;

            // Customer melihat pesanannya
            if (role === "CUSTOMER") {
                orders = await db
                    .select()
                    .from(ordersTable)
                    .where(eq(ordersTable.userId, userId))
                    .orderBy(desc(ordersTable.createdAt));

            } else if (role === "ADMIN") {
                // Admin melihat semua pesanan
                orders = await db
                .select()
                .from(ordersTable)
                .orderBy(desc(ordersTable.createdAt))

            } else {
                return res.status(403).json({
                    success: false,
                    message: "Anda tidak memmiliki akses untuk melihat pesanan"
                })
            }

            return res.status(200).json({
                success: true,
                message: "Berhasil mengambil daftar pesanan",
                data: orders,
            })

        } catch (error) {
            console.error("Get All oerder error: ", error)

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan saat mengambil daftar pesanan"
            })
        }
    }

    // GET ORDER BY ID
    static async getOrdersById(req: AuthRequest, res: Response) {
        try {
            // 1. Memastikan pengguna sudah login
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Silakan login terlebih dahulu",
                });
            }

            // 2. Mengambil dan memvalidasi ID pesanan
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID pesanan tidak valid",
                });
            }

            const { userId, role } = req.user;

            // 3. Mengambil data pesanan
            const [orders] = await db
                .select()
                .from(ordersTable)
                .where(eq(ordersTable.id, id))
                .limit(1);

            if (!orders) {
                return res.status(404).json({
                    success: false,
                    message: "Pesanan tidak ditemukan",
                });
            }

            // 4. Memeriksa hak akses CUSTOMER
            if (role === "CUSTOMER" && orders.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Kamu tidak memiliki akses ke pesanan ini",
                });
            }

            // 5. Memeriksa role pengguna
            if (role !== "CUSTOMER" && role !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    message: "Kamu tidak memiliki akses untuk melihat pesanan",
                });
            }

            // 6. Mengambil detail pesanan
            const details = await db
                .select()
                .from(orderDetailsTable)
                .where(eq(orderDetailsTable.orderId, id));

            // 7. Mengirim respons
            return res.status(200).json({
                success: true,
                message: "Berhasil mengambil detail pesanan",
                data: {
                    orders,
                    details,
                },
            });

        } catch (error) {
            console.error("Get order by ID error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan saat mengambil detail pesanan",
            });
        }
    }

    // UPDATE ORDER (ADMIN)
    static async updateOrders(req: AuthRequest, res: Response) {
        try {
            // 1. Memastikan pengguna sudah login
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Silakan login terlebih dahulu",
                });
            }

            // 2. Memastikan hanya ADMIN yang bisa memperbarui pesanan
            if (req.user.role !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    message: "Hanya admin yang dapat memperbarui pesanan",
                });
            }

            // 3. Validasi ID pesanan
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID pesanan tidak valid",
                });
            }

            // 4. Validasi input
            const validation = updateOrderSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validasi gagal",
                    errors: validation.error.flatten().fieldErrors,
                });
            }

            const data = validation.data;

            // 5. Memeriksa apakah pesanan tersedia
            const [order] = await db
                .select()
                .from(ordersTable)
                .where(eq(ordersTable.id, id))
                .limit(1);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Pesanan tidak ditemukan",
                });
            }

            // 6. Memastikan pesanan masih menunggu pemeriksaan
            if (order.status !== "PENDING_REVIEW") {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan sudah diperiksa sebelumnya",
                });
            }

            // 7. Mengambil detail pesanan
            const details = await db
                .select()
                .from(orderDetailsTable)
                .where(eq(orderDetailsTable.orderId, id));

            if (details.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Detail pesanan tidak ditemukan",
                });
            }

            // 8. Memperbarui harga dan total pesanan
            const result = await db.transaction(async (tx) => {

                // Saat ini setiap order dibuat dengan satu detail
                const detail = details[0];

                const [updatedDetail] = await tx
                    .update(orderDetailsTable)
                    .set({
                        agreedPrice: data.agreedPrice,
                    })
                    .where(eq(orderDetailsTable.id, detail.id))
                    .returning();

                const totalPrice =
                    data.agreedPrice * detail.quantity;

                const [updatedOrder] = await tx
                    .update(ordersTable)
                    .set({
                        totalPrice,
                        estimatedDays: data.estimatedDays,
                        adminNotes: data.adminNotes ?? null,
                        status: "WAITING_PAYMENT",
                        updatedAt: new Date(),
                    })
                    .where(eq(ordersTable.id, id))
                    .returning();

                return {
                    order: updatedOrder,
                    detail: updatedDetail,
                };
            });

            // 9. Mengirim respons berhasil
            return res.status(200).json({
                success: true,
                message: "Pesanan berhasil diperiksa dan menunggu pembayaran",
                data: result,
            });

        } catch (error) {
            console.error("Update order error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan saat memperbarui pesanan",
            });
        }
    }

}
