import express from "express";
import { validateUser } from "../middleware/validateCreateUser";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import {
  getUserProfile,
  login,
  protectAuth,
  protectWithoutEmailVerify,
  signup,
  verifyEmail,
} from "../controllers/auth.controller";
const router = express.Router();

router
  .route("/signup")
  .post(upload.single("avatarUrl"), validateUser, uploadToCloudinary, signup);

router.route("/login").post(login);

router.route("/verify-email").post(protectWithoutEmailVerify, verifyEmail);

router.route("/get-profile").get(protectAuth, getUserProfile);

export default router;
