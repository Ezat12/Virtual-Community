import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import { allowedTo } from "../middleware/auth/allowedTo";
import {
  createCommunity,
  deleteCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
} from "../controllers/community.controller";
import { upload } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../middleware/uploadToCloudinary";
import {
  validateCommunityCreated,
  validateCommunityUpdated,
} from "../middleware/validation/validateCommunity";

import communityMemberShips from "./communityMemberShips.route";
const router = express.Router();

router
  .route("/")
  .post(
    protectAuth,
    upload.single("avatarUrl"),
    validateCommunityCreated,
    uploadToCloudinary,
    createCommunity
  )
  .get(getAllCommunities);

router
  .route("/:id")
  .get(getCommunityById)
  .put(
    protectAuth,
    upload.single("avatarUrl"),
    validateCommunityUpdated,
    uploadToCloudinary,
    updateCommunity
  )
  .delete(protectAuth, deleteCommunity);

router.use("/:communityId/members", communityMemberShips);

export default router;
