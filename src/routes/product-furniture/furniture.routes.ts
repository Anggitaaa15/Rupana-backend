import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router()

router.post("/", authenticate, authorize("ADMIN"));

export default router;