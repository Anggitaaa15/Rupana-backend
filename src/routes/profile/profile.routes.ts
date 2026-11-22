import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { ProfileController } from "../../controller/profile/profile.controller";

const router = Router()

router.get("/", authenticate, ProfileController.getProfile)
router.put("/", authenticate, ProfileController.updateProfile)

export default router;