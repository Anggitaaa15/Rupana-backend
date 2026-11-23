import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { furnitureController } from "../../controller/product-furniture/furniture.controller";

const router = Router()

router.post("/", authenticate, authorize("ADMIN"), furnitureController.createProduct);
router.get("/", authenticate, authorize("ADMIN", "CUSTOMER"), furnitureController.getAllProducts);
router.get("/:id", authenticate, authorize("ADMIN", "CUSTOMER"), furnitureController.getProductById);
router.put("/:id", authenticate, authorize("ADMIN"), furnitureController.updateProduct);

export default router;