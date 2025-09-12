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
import { uploadSingle } from "../middleware/uploadMiddleware";
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
    uploadSingle("avatarUrl"),
    validateCommunityCreated,
    uploadToCloudinary,
    createCommunity
  )
  .get(getAllCommunities);

router
  .route("/:communityId")
  .get(getCommunityById)
  .put(
    protectAuth,
    uploadSingle("avatarUrl"),
    validateCommunityUpdated,
    uploadToCloudinary,
    updateCommunity
  )
  .delete(protectAuth, deleteCommunity);

router.use("/:communityId/memberships", communityMemberShips);

export default router;
