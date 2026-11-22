import { Router } from "express";
import { CategoryController } from "../../controller/category/category.controller";

const router = Router()

router.post("/", CategoryController.createCategory);
router.get("/", CategoryController.getAll);
router.get("/:id", CategoryController.getById);
router.put("/:id", CategoryController.updateCategory);
router.delete("/:id", CategoryController.deleteCategory);

export default router;