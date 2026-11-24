import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { uploadSingleImage } from "../../middleware/upload.middleware";

import { OrderController } from "../../controller/order/order.controller";

const router = Router();

router.post("/", authenticate, authorize("CUSTOMER"), uploadSingleImage, OrderController.createOrder);

export default router;
