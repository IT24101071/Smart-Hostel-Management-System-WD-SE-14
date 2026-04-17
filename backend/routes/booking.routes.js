import express from "express";
import {
  cancelBooking,
  createBooking,
  deleteAllBookings,
  extendBooking,
  getBookingReceipt,
  getMyBookings,
  getMyLatestBooking,
} from "../controllers/booking.controller.js";
import { adminOnly, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me/latest", protect, getMyLatestBooking);
router.get("/me", protect, getMyBookings);
router.get("/:id/receipt", protect, getBookingReceipt);
router.post("/:id/cancel", protect, cancelBooking);
router.post("/:id/extend", protect, extendBooking);
router.delete("/", protect, adminOnly, deleteAllBookings);
router.post("/", protect, createBooking);

export default router;
