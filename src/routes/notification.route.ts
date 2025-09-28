import express from "express";
import {
  getAllNotificationUser,
  readAllNotificationUser,
  readNotification,
} from "../controllers/notification.controller";
import { protectAuth } from "../middleware/auth/protectAuth";
const router = express.Router();

router.use(protectAuth);

router.get("/", getAllNotificationUser);
router.put("/read-all", readAllNotificationUser);
router.patch("/:notificationId/read-one", readNotification);

export default router;
