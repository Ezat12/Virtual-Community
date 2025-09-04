import express from "express";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost,
} from "../controllers/post.controller";
import { uploadMultiple } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  validateDeletePostById,
  validateGetPostById,
  validatePostCreated,
} from "../middleware/validation/validationPost";

const router = express.Router();

router
  .route("/:communityId")
  .post(
    protectAuth,
    uploadMultiple("media", 7),
    uploadToCloudinary,
    validatePostCreated,
    createPost
  )
  .get(protectAuth, getAllPosts);

router
  .route("/:communityId/post/:postId")
  .get(protectAuth, validateGetPostById, getPostById)
  .patch(protectAuth, updatePost)
  .delete(protectAuth, validateDeletePostById, deletePost);

export default router;
