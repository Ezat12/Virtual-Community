import express from "express";
import {
  addReaction,
  getAllLikes,
  getLike,
  removeLike,
  updateReaction,
} from "../controllers/likes.controller";
import { protectAuth } from "../middleware/auth/protectAuth";
const router = express.Router();

router.use(protectAuth);

router.route("/:postId/reactions").post(addReaction).get(getAllLikes);
router.route("/:likeId").get(getLike).patch(updateReaction).delete(removeLike);

export default router;
