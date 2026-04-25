import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Room from "../models/Room.js";

// Get all bookings with payment status for admin
export const getAllBookingsWithPayments = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("student", "name email phone")
      .populate("room", "roomNumber type gender")
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
      .populate("room", "roomNumber type gender")
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
  console.log(`[API] Confirming payment ${req.params.id}`, req.body);
  try {
    const { id } = req.params;
    const { paymentStatus, bookingStatus } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Update payment status
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    // Update booking status if provided
    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;
    }

    await booking.save();

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
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const bookings = await Booking.find({ paymentStatus: status })
      .populate("student", "name email phone")
      .populate("room", "roomNumber type gender")
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
