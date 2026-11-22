import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { ProfileController } from "../../controller/profile/profile.controller";
import { uploadSingleImage } from "../../middleware/upload.middleware";

const router = Router()

router.get("/", authenticate, ProfileController.getProfile);
router.put("/", authenticate, ProfileController.updateProfile);
router.put("/image", authenticate, uploadSingleImage, ProfileController.uploadProfileImage);
router.delete("/image", authenticate, ProfileController.deleteProfileImage);

export default router;