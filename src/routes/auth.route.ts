import express from "express";
import { validateUser } from "../middleware/validateCreateUser";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import {
  forgetPassword,
  getUserProfile,
  login,
  resetPassword,
  signup,
  verifyEmail,
  verifyResetPasswordCode,
} from "../controllers/auth.controller";
import { protectWithoutEmailVerify } from "../middleware/auth/protectWithoutEmail";
import { protectAuth } from "../middleware/auth/protectAuth";
const router = express.Router();

router
  .route("/signup")
  .post(upload.single("avatarUrl"), validateUser, uploadToCloudinary, signup);

router.route("/login").post(login);

router.route("/verify-email").post(protectWithoutEmailVerify, verifyEmail);

router.route("/get-profile").get(protectAuth, getUserProfile);

router.route("/forget-password").post(forgetPassword);
router.route("/verify-password-code").post(verifyResetPasswordCode);
router.route("/reset-password").post(resetPassword);

export default router;
