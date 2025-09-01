import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  deleteMemberByAdmin,
  getAllMembers,
  getAuditLog,
  getPendingRequest,
  handleJoinRequest,
  joinCommunity,
  leaveCommunity,
} from "../controllers/communityMembers.controller";
import { validateJoinRequest } from "../middleware/validation/validateCommunityMemberShip";

const router = express.Router({ mergeParams: true });

router.use(protectAuth);

router.post("/join", validateJoinRequest, joinCommunity);

router.delete("/leave", leaveCommunity);
router.delete("/delete-member/:memberId", deleteMemberByAdmin);

router.get("/join-requests", getPendingRequest);

router.patch("/join-requests/:requestId", handleJoinRequest);

router.get("/members", getAllMembers);

router.get("/audit-logs", getAuditLog);

export default router;
