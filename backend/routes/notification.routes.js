import express from "express";
import {
  getMyNotifications,
  markAllRead,
  markNotificationRead,
  sendPeerInviteNotifications,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyNotifications);
router.post("/peer-invite", sendPeerInviteNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllRead);

export default router;
