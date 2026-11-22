import { Router } from "express";
import { AuthController } from "../../controller/auth/auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

export default router;