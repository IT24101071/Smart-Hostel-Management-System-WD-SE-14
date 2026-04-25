import express from "express";
import {
  getAllBookingsWithPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
  getPaymentStats,
  getBookingsByStatus,
} from "../controllers/payment.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect, adminOnly);

// Get all bookings with payment details
router.get("/bookings", getAllBookingsWithPayments);

// Get pending payments (submitted status)
router.get("/pending", getPendingPayments);

// Get payment statistics
router.get("/stats", getPaymentStats);

// Get bookings by payment status
router.get("/status/:status", getBookingsByStatus);

// Confirm payment
router.put("/:id/confirm", confirmPayment);

// Reject payment
router.put("/:id/reject", rejectPayment);

export default router;
