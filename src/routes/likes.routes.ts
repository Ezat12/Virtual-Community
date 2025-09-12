import express from "express";
import {
  addLikeToComment,
  addReaction,
  getAllLikesToPost,
  getAllLikeToComment,
  getLike,
  removeLike,
  updateReaction,
} from "../controllers/likes.controller";
import { protectAuth } from "../middleware/auth/protectAuth";
const router = express.Router();

router.use(protectAuth);

router.route("/:postId/reactions").post(addReaction).get(getAllLikesToPost);
router.route("/:likeId").get(getLike).patch(updateReaction).delete(removeLike);

router
  .route("/comment/:commentId")
  .post(addLikeToComment)
  .get(getAllLikeToComment);

export default router;
