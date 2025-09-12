import express from "express";
import {
  validateComment,
  validateDeleteComment,
} from "../middleware/validation/validateComment";
import {
  addComment,
  addCommentReferences,
  deleteComment,
  getCommentById,
  getCommentsByPost,
  getCommentsReferencesToComment,
  updateComment,
} from "../controllers/comments.controller";
import { protectAuth } from "../middleware/auth/protectAuth";
const router = express.Router();

router.use(protectAuth);

router
  .route("/:postId")
  .post(validateComment, addComment)
  .get(getCommentsByPost);
router
  .route("/comment/:commentId/reference")
  .post(validateComment, addCommentReferences)
  .get(getCommentsReferencesToComment);

router.route("/update/:commentId").put(validateComment, updateComment);

router.route("/comment/:commentId").get(getCommentById);

router.route("/delete/:commentId").delete(validateDeleteComment, deleteComment);

export default router;
