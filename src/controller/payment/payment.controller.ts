import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createPaymentSchema } from "../../validations/payment.validation";
import { db } from "../../config/db";
import { and, desc, eq, sum } from "drizzle-orm";
import { ordersTable, paymentsTable, usersTable } from "../../config/schema";
import { createSnapTransaction } from "../../service/midtrans.service";
import { verifyMidtransSignature } from "../../service/midtrans-webhook.service";

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

      // Memeriksa apakah masih ada transaksi yang menunggu pembayaran
      const [pendingPayment] = await db
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.orderId, orderId),
            eq(paymentsTable.status, "PENDING"),
          ),
        )
        .limit(1);

      // Mencegah pembuatan transaksi pembayaran ganda
      if (pendingPayment) {
        return res.status(400).json({
          success: false,
          message: "Masih ada pembayaran yang menunggu penyelesaian",
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
              eq(paymentsTable.status, "SETTLEMENT"),
            ),
          );

        // Menghitung sisa pembayaran
        amount = Number(order.totalPrice) - Number(payment?.totalPaid || 0);
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

  static async handleWebhook(req: AuthRequest, res: Response) {
    try {
      // Mengambil data notifikasi dari Midtrans
      const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status,
      } = req.body;

      // Memastikan data notifikasi tersedia
      if (
        !order_id ||
        !status_code ||
        !gross_amount ||
        !signature_key ||
        !transaction_status
      ) {
        return res.status(400).json({
          success: false,
          message: "Data notifikasi tidak lengkap",
        });
      }

      // Memverifikasi signature dari Midtrans
      const isValid = verifyMidtransSignature(
        order_id,
        status_code,
        gross_amount,
        signature_key,
      );

      if (!isValid) {
        return res.status(403).json({
          success: false,
          message: "Signature tidak valid",
        });
      }

      // Mencari pembayaran berdasarkan ID transaksi Midtrans
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.midtransOrderId, order_id))
        .limit(1);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Data pembayaran tidak ditemukan",
        });
      }

      // Memastikan nominal pembayaran sesuai
      if (Number(gross_amount) !== Number(payment.amount)) {
        return res.status(400).json({
          success: false,
          message: "Nominal pembayaran tidak sesuai",
        });
      }

      // Jika pembayaran berhasil
      if (
        transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept")
      ) {
        // Memperbarui pembayaran dan pesanan dalam satu transaksi database
        await db.transaction(async (tx) => {
          // Mengambil data pembayaran terbaru
          const [currentPayment] = await tx
            .select()
            .from(paymentsTable)
            .where(eq(paymentsTable.midtransOrderId, order_id))
            .limit(1);

          if (!currentPayment) {
            throw new Error("Data pembayaran tidak ditemukan");
          }

          // Memperbarui status pembayaran jika belum berhasil
          if (currentPayment.status !== "SETTLEMENT") {
            await tx
              .update(paymentsTable)
              .set({
                status: "SETTLEMENT",
                paidAt: new Date(),
              })
              .where(eq(paymentsTable.midtransOrderId, order_id));
          }

          // Mengambil data pesanan terbaru
          const [order] = await tx
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.id, currentPayment.orderId))
            .limit(1);

          // Memperbarui status pesanan jika masih dalam proses pembayaran
          if (order && ["WAITING_PAYMENT", "DP_PAID"].includes(order.status)) {
            const orderStatus =
              currentPayment.paymentType === "DP" ? "DP_PAID" : "PAID";

            // Mencegah status pesanan berubah mundur
            if (
              order.status !== "PAID" &&
              (currentPayment.paymentType !== "DP" ||
                order.status === "WAITING_PAYMENT")
            ) {
              await tx
                .update(ordersTable)
                .set({
                  status: orderStatus,
                })
                .where(eq(ordersTable.id, currentPayment.orderId));
            }
          }
        });
      }

      // Jika transaksi kedaluwarsa
      else if (transaction_status === "expire") {
        await db
          .update(paymentsTable)
          .set({
            status: "EXPIRE",
          })
          .where(
            and(
              eq(paymentsTable.midtransOrderId, order_id),
              eq(paymentsTable.status, "PENDING"),
            ),
          );
      }

      return res.status(200).json({
        success: true,
        message: "Notifikasi berhasil diproses",
      });
    } catch (error) {
      console.error("Midtrans Webhook Error:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal memproses notifikasi pembayaran",
      });
    }
  }

  static async getPaymentsByOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const orderId = Number(req.params.orderId);

      // Memastikan customer sudah login
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Silakan login terlebih dahulu",
        });
      }

      // Memvalidasi ID pesanan
      if (!Number.isInteger(orderId) || orderId <= 0) {
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

      // Memastikan pesanan milik customer yang login
      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Kamu tidak memiliki akses ke pesanan ini",
        });
      }

      // Mengambil riwayat pembayaran berdasarkan pesanan
      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.orderId, orderId))
        .orderBy(desc(paymentsTable.createdAt));

      return res.status(200).json({
        success: true,
        message: "Riwayat pembayaran berhasil ditemukan",
        data: payments,
      });
    } catch (error) {
      console.error("Get Payments Error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat mengambil riwayat pembayaran",
      });
    }
  }
}
