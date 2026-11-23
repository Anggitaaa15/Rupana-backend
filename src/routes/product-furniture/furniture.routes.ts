import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { FurnitureController } from "../../controller/product-furniture/furniture.controller";
import { uploadSingleImage } from "../../middleware/upload.middleware";

const router = Router()

router.post("/", authenticate, authorize("ADMIN"), uploadSingleImage, FurnitureController.createProduct);
router.get("/", authenticate, authorize("ADMIN", "CUSTOMER"), FurnitureController.getAllProducts);
router.get("/:id", authenticate, authorize("ADMIN", "CUSTOMER"), FurnitureController.getProductById);
router.put("/:id", authenticate, authorize("ADMIN"), uploadSingleImage, FurnitureController.updateProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), FurnitureController.deleteProduct);

export default router;