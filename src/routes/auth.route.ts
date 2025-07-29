import express from "express";
import { validateUser } from "../middleware/validateCreateUser";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import { login, signup } from "../controllers/auth.controller";
const router = express.Router();

router
  .route("/signup")
  .post(upload.single("avatarUrl"), validateUser, uploadToCloudinary, signup);

router.route("/login").post(login);

export default router;
