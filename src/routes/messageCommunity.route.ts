import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  validateDeleteMessageToCommunity,
  validateSendMessageToCommunity,
  validateUpdateMessageToCommunity,
} from "../middleware/validation/messageCommunity";
import {
  addMessageCommunity,
  deleteMessageCommunity,
  getAllMessageCommunity,
  getMessageCommunityUser,
  updateMessageCommunity,
} from "../controllers/messageCommunity.controller";
const router = express.Router();

router.post(
  "/:communityId/send-message",
  protectAuth,
  validateSendMessageToCommunity,
  addMessageCommunity
);

router.get(
  "/:communityId/getMessage-user",
  protectAuth,
  getMessageCommunityUser
);

router.get("/:communityId/get-allMessage", protectAuth, getAllMessageCommunity);

router.patch(
  "/:messageId/update-message",
  protectAuth,
  validateUpdateMessageToCommunity,
  updateMessageCommunity
);

router.delete(
  "/:messageId/delete-message",
  protectAuth,
  validateDeleteMessageToCommunity,
  deleteMessageCommunity
);
export default router;
