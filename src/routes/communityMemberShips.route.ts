import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  deleteMemberByAdmin,
  getAllMembers,
  getPendingRequest,
  handleJoinRequest,
  joinCommunity,
  leaveCommunity,
} from "../controllers/communityMembers.controller";

const router = express.Router({ mergeParams: true });

router.use(protectAuth);

router.post("/:communityId/join", joinCommunity);

router.delete("/:communityId/leave", leaveCommunity);
router.delete("/:communityId/members/:memberId", deleteMemberByAdmin);

router.get("/:communityId/join-request", getPendingRequest);

router.patch("/:communityId/join-requests/:requestId", handleJoinRequest);

router.get("/:communityId/members", getAllMembers);

export default router;
