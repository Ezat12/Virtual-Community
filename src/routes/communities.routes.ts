import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import { allowedTo } from "../middleware/auth/allowedTo";
import {
  createCommunity,
  getAllCommunities,
} from "../controllers/community.controller";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import { validateCommunity } from "../middleware/validateCommunity";
const router = express.Router();

router
  .route("/")
  .post(
    protectAuth,
    allowedTo("user", "admin"),
    upload.single("avatarUrl"),
    validateCommunity,
    uploadToCloudinary,
    createCommunity
  )
  .get(getAllCommunities);

export default router;
