import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { OrderProgressController } from "../../controller/order-progress/order-progress.controller";
import { uploadSingleImage } from "../../middleware/upload.middleware";

const router = Router();

router.post("/:orderId", authenticate, authorize("CRAFTSMAN"), uploadSingleImage, OrderProgressController.createProgress);
router.get("/:orderId", authenticate, OrderProgressController.getProgressByOrder);

export default router;