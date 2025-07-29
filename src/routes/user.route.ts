import express from "express";
import {
  createUser,
  deleteUser,
  getAllUser,
  getUserById,
  updateUser,
} from "../controllers/users.controller";
import { validateUser } from "../middleware/validateCreateUser";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import { protectAuth } from "../controllers/auth.controller";
const router = express.Router();

router
  .route("/")
  .post(
    upload.single("avatarUrl"),
    uploadToCloudinary,
    validateUser,
    createUser
  )
  .get(protectAuth, getAllUser);
router.route("/:id").get(getUserById).put(updateUser).delete(deleteUser);

export default router;
