import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { uploadSingleImage } from "../../middleware/upload.middleware";
import { OrdersController } from "../../controller/order/order.controller";

const router = Router();

router.post("/", authenticate, authorize("CUSTOMER"), uploadSingleImage, OrdersController.createOrders);
router.get("/", authenticate, authorize("CUSTOMER", "ADMIN"), OrdersController.getAllOrders);
router.get("/:id", authenticate, authorize("CUSTOMER", "ADMIN"), OrdersController.getOrdersById);

export default router;
