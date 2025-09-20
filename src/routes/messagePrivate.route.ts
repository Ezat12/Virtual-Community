import express from "express";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  validateDeleteMessagePrivate,
  validateSendMessagePrivate,
  validateUpdateMessagePrivate,
} from "../middleware/validation/messagePrivate";
import {
  deleteMessage,
  getConversationBetweenUser,
  getUserConversations,
  readAllMessage,
  sendPrivateMessage,
  updateMessage,
} from "../controllers/messagePrivate.controller";
const router = express.Router();

router.use(protectAuth);

router.post("/send-message", validateSendMessagePrivate, sendPrivateMessage);

router.get("/get-conversation/:userId", getConversationBetweenUser);

router.get("/get-conversationUser", getUserConversations);

router.put("/read-allMessages/:senderId", readAllMessage);

router.patch(
  "/update-message/:messageId",
  validateUpdateMessagePrivate,
  updateMessage
);

router.delete(
  "/delete-message/:messageId",
  validateDeleteMessagePrivate,
  deleteMessage
);

export default router;
