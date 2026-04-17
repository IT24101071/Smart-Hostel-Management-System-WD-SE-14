import express from "express";
import {
  createBooking,
  getMyBookings,
  getMyLatestBooking,
  respondToPeerInvite,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me/latest", protect, getMyLatestBooking);
router.get("/me", protect, getMyBookings);
router.post("/:id/peer-response", protect, respondToPeerInvite);
router.post("/", protect, createBooking);

export default router;
