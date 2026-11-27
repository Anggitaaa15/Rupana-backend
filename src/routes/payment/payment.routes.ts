import { Router } from 'express';
import { PaymentController } from '../../controller/payment/payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';

const router = Router();

// Menerima notifikasi pembayaran dari Midtrans
router.post("/notification", PaymentController.handleWebhook);
router.post("/:orderId", authenticate, authorize("CUSTOMER"), PaymentController.createPayment);
router.get("/:orderId", authenticate, authorize("CUSTOMER"),PaymentController.getPaymentsByOrder);

export default router;