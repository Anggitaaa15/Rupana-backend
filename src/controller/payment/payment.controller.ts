import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createPaymentSchema } from "../../validations/payment.validation";
import { db } from "../../config/db";
import { and, eq, sum } from "drizzle-orm";
import { ordersTable, paymentsTable, usersTable } from "../../config/schema";
import { createSnapTransaction } from "../../service/midtrans.service";

export class PaymentController {

    static async createPayment(req: AuthRequest, res: Response) {
        try {

            // 1. Mengambil ID customer dari token JWT
            const userId = req.user?.userId;

            // 2. Mengambil ID pesanan dari parameter URL
            const orderId = Number(req.params.orderId);

            // 3. Memastikan customer sudah login
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Silakan login terlebih dahulu",
                });
            }

            // 4. Memvalidasi ID pesanan
            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID pesanan tidak valid",
                });
            }

            // 5. Memvalidasi jenis pembayaran dari request body
            const validation = createPaymentSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    message: "Data pembayaran tidak valid",
                    errors: validation.error.flatten().fieldErrors,
                });
            }

            const { paymentType } = validation.data;

            // 6. Mengambil data pesanan dari database
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

            // 7. Memastikan pesanan merupakan milik customer yang login
            if (order.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Kamu tidak memiliki akses ke pesanan ini",
                });
            }

            // 8. Memastikan pesanan sudah bisa dibayar
            if (!["WAITING_PAYMENT", "DP_PAID"].includes(order.status)) {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan belum dapat dibayar",
                });
            }

            // 9. Memvalidasi jenis pembayaran berdasarkan status pesanan
            if (order.status === "WAITING_PAYMENT" && paymentType === "REMAINING") {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan belum melakukan pembayaran DP",
                });
            }

            if (order.status === "DP_PAID" && paymentType !== "REMAINING") {
                return res.status(400).json({
                    success: false,
                    message: "Pesanan sudah membayar DP, silakan lakukan pelunasan",
                });
            }

            // 10. Menghitung nominal pembayaran
            let amount = 0;

            if (paymentType === "DP") {
                amount = Math.ceil(Number(order.totalPrice) * 0.5);
            }

            if (paymentType === "FULL") {
                amount = Number(order.totalPrice);
            }

            if (paymentType === "REMAINING") {

                // Menghitung total pembayaran yang sudah berhasil
                const [payment] = await db
                    .select({
                        totalPaid: sum(paymentsTable.amount),
                    })
                    .from(paymentsTable)
                    .where(
                        and(
                            eq(paymentsTable.orderId, orderId),
                            eq(paymentsTable.status, "SETTLEMENT")
                        )
                    );

                // Menghitung sisa pembayaran
                amount =
                    Number(order.totalPrice) - Number(payment?.totalPaid || 0);
            }

            // Memastikan nominal pembayaran valid
            if (!Number.isSafeInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Nominal pembayaran tidak valid",
                });
            }

            // 11. Mengambil data customer dari database
            const [customer] = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, userId))
                .limit(1);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Data customer tidak ditemukan",
                });
            }

            // 12. Membuat ID transaksi unik untuk Midtrans
            const midtransOrderId = `RUPANA-${order.id}-${Date.now()}`;

            // 13. Membuat transaksi pembayaran ke Midtrans
            const transaction = await createSnapTransaction({
                orderId: midtransOrderId,
                amount,
                customerName: customer.username,
                customerEmail: customer.email,
            });

            // 14. Menyimpan transaksi pembayaran ke database
            const [payment] = await db
                .insert(paymentsTable)
                .values({
                    orderId: order.id,
                    midtransOrderId,
                    paymentType,
                    amount,
                    status: "PENDING",
                    snapUrl: transaction.redirectUrl,
                })
                .returning();

            // 15. Mengirim data pembayaran ke Flutter
            return res.status(201).json({
                success: true,
                message: "Transaksi pembayaran berhasil dibuat",
                data: {
                    payment,
                    snapToken: transaction.token,
                    redirectUrl: transaction.redirectUrl,
                },
            });

        } catch (error) {
            console.error("Create Payment Error:", error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan saat membuat pembayaran",
            });
        }
    }
}
