import { Router } from "express";
import { CategoryController } from "../../controller/category/category.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router()

router.post("/", authenticate, authorize("ADMIN"), CategoryController.createCategory);
router.get("/", authenticate, authorize("CUSTOMER", "ADMIN"), CategoryController.getAll);
router.get("/:id", authenticate, authorize("CUSTOMER", "ADMIN"), CategoryController.getById);
router.put("/:id", authenticate, authorize("ADMIN"), CategoryController.updateCategory);
router.delete("/:id", authenticate, authorize("ADMIN"), CategoryController.deleteCategory);

export default router;