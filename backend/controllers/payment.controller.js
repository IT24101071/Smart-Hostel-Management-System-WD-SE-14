import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import { sendBookingConfirmationEmail, sendRefundConfirmationEmail } from "../utils/brevoEmail.js";

// Get all bookings with payment status for admin
export const getAllBookingsWithPayments = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("student", "name email phone")
      .populate("room", "roomNumber roomType gender")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get pending payments (submitted status)
export const getPendingPayments = async (req, res) => {
  try {
    const bookings = await Booking.find({ paymentStatus: "submitted" })
      .populate("student", "name email phone")
      .populate("room", "roomNumber roomType gender")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Confirm payment (admin action)
export const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.paymentStatus !== "submitted") {
      return res.status(400).json({
        success: false,
        message:
          "Only bookings pending bank verification (submitted) can be confirmed here",
      });
    }

    booking.paymentStatus = "completed";
    booking.bookingStatus = "confirmed";

    await booking.save();

    try {
      const bookingWithDetails = await Booking.findById(id)
        .populate("student", "name email")
        .populate("room", "roomNumber roomType gender");
      if (bookingWithDetails?.student?.email && bookingWithDetails?.room) {
        await sendBookingConfirmationEmail({
          toEmail: bookingWithDetails.student.email,
          studentName: bookingWithDetails.student.name,
          booking: bookingWithDetails,
          room: bookingWithDetails.room,
          includeReceiptAttachment: false,
        });
      }
    } catch (emailError) {
      console.error("[confirmPayment] Failed to send booking email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject payment (admin action)
export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.paymentStatus = "failed";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Payment rejected",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Process refund (admin action)
export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("student", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.paymentStatus !== "refund_pending") {
      return res.status(400).json({
        success: false,
        message: "Only bookings with pending refunds can be processed here",
      });
    }

    booking.paymentStatus = "refunded";
    await booking.save();

    try {
      if (booking.student?.email) {
        await sendRefundConfirmationEmail({
          toEmail: booking.student.email,
          studentName: booking.student.name,
          booking: booking,
        });
      }
    } catch (emailError) {
      console.error("[processRefund] Failed to send refund email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingPayments = await Booking.countDocuments({
      paymentStatus: "submitted",
    });
    const completedPayments = await Booking.countDocuments({
      paymentStatus: "completed",
    });
    const failedPayments = await Booking.countDocuments({
      paymentStatus: "failed",
    });
    const refundPending = await Booking.countDocuments({
      paymentStatus: "refund_pending",
    });
    const refundedPayments = await Booking.countDocuments({
      paymentStatus: "refunded",
    });

    // Calculate total revenue from completed payments
    const completedBookings = await Booking.find({
      paymentStatus: "completed",
    });
    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + (booking.amountPaidByBooker || 0),
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        pendingPayments,
        completedPayments,
        failedPayments,
        refundPending,
        refundedPayments,
        totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get bookings by payment status
export const getBookingsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const validStatuses = [
      "pending",
      "submitted",
      "confirmed",
      "completed",
      "failed",
      "refund_pending",
      "refunded",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const bookings = await Booking.find({ paymentStatus: status })
      .populate("student", "name email phone")
      .populate("room", "roomNumber roomType gender")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
