import express from "express";
import {
  createPeerInvite,
  getMyPeerInvites,
  respondToPeerInvite,
} from "../controllers/peerInvite.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyPeerInvites);
router.post("/", createPeerInvite);
router.post("/:id/respond", respondToPeerInvite);

export default router;
