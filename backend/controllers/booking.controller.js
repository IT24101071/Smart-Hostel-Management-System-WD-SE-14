import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Room from "../models/Room.js";

function parseDateOrNull(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfTomorrow(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function recalculateAvailability({ currentOccupancy, capacity, status }) {
  if (status === "Maintenance") return "Maintenance";
  return currentOccupancy >= capacity ? "Full" : "Available";
}

function toBookingDto(booking) {
  return {
    id: booking._id,
    room: booking.room,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    stayDays: booking.stayDays,
    roomFees: booking.roomFees,
    securityDeposit: booking.securityDeposit,
    totalDue: booking.totalDue,
    amountPaidByBooker: booking.amountPaidByBooker,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    receiptAvailable: booking.paymentStatus === "completed",
    receiptFileName: `booking-receipt-${booking._id}.pdf`,
    receiptUploaded: Boolean(booking.receipt?.uri),
    createdAt: booking.createdAt,
  };
}

function formatDateTime(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}

function buildReceiptText(booking) {
  return [
    "SMART HOSTEL MANAGEMENT SYSTEM",
    "Payment Receipt",
    "",
    `Receipt No: RCP-${String(booking._id).slice(-8).toUpperCase()}`,
    `Booking ID: ${booking._id}`,
    `Generated At: ${formatDateTime(new Date())}`,
    "",
    `Room: ${booking.room?.roomNumber ?? "--"}`,
    `Check-In: ${formatDateTime(booking.checkInDate)}`,
    `Check-Out: ${formatDateTime(booking.checkOutDate)}`,
    `Stay Days: ${booking.stayDays}`,
    "",
    `Room Fees: Rs. ${Number(booking.roomFees ?? 0).toLocaleString()}`,
    `Security Deposit: Rs. ${Number(booking.securityDeposit ?? 0).toLocaleString()}`,
    `Total Paid: Rs. ${Number(booking.totalDue ?? 0).toLocaleString()}`,
    `Payment Method: ${String(booking.paymentMethod ?? "").toUpperCase()}`,
    `Payment Status: ${String(booking.paymentStatus ?? "").toUpperCase()}`,
    "",
    "Thank you for your payment.",
  ].join("\n");
}

export const createBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const {
      roomId,
      checkInDate,
      checkOutDate,
      stayDays,
      roomFees,
      securityDeposit,
      totalDue,
      paymentMethod,
      receipt,
      cardMasked,
    } = req.body ?? {};

    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const checkIn = parseDateOrNull(checkInDate);
    const checkOut = parseDateOrNull(checkOutDate);
    if (!checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "checkInDate and checkOutDate must be valid dates" });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ message: "Check-out must be after check-in" });
    }
    if (checkIn < startOfTomorrow()) {
      return res.status(400).json({
        message: "Check-in date must be a future date (today is not allowed)",
      });
    }

    const parsedStayDays = Number(stayDays);
    const parsedRoomFees = Number(roomFees);
    const parsedDeposit = Number(securityDeposit);
    const parsedTotal = Number(totalDue);
    if (!Number.isFinite(parsedStayDays) || parsedStayDays < 1) {
      return res.status(400).json({ message: "stayDays must be at least 1" });
    }
    if (
      !Number.isFinite(parsedRoomFees) ||
      parsedRoomFees < 0 ||
      !Number.isFinite(parsedDeposit) ||
      parsedDeposit < 0 ||
      !Number.isFinite(parsedTotal) ||
      parsedTotal < 0
    ) {
      return res.status(400).json({ message: "Invalid payment amount values" });
    }
    if (!["card", "bank"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: "paymentMethod must be card or bank" });
    }
    if (paymentMethod === "bank" && !String(receipt?.uri ?? "").trim()) {
      return res
        .status(400)
        .json({ message: "Receipt is required for bank deposits" });
    }

    const nextOccupancy = Number(room.currentOccupancy) + 1;
    if (nextOccupancy > Number(room.capacity)) {
      return res
        .status(400)
        .json({ message: "Room no longer has enough capacity to confirm booking" });
    }

    const booking = await Booking.create({
      student: req.user.id,
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      stayDays: parsedStayDays,
      roomFees: parsedRoomFees,
      securityDeposit: parsedDeposit,
      totalDue: parsedTotal,
      amountPaidByBooker: parsedTotal,
      paymentMethod,
      paymentStatus: "completed",
      bookingStatus: "confirmed",
      receipt:
        paymentMethod === "bank"
          ? {
              uri: String(receipt?.uri ?? "").trim(),
              name: String(receipt?.name ?? "").trim(),
              mimeType: String(receipt?.mimeType ?? "").trim(),
              size:
                receipt?.size === undefined || receipt?.size === null
                  ? undefined
                  : Number(receipt.size),
            }
          : undefined,
      cardMasked:
        paymentMethod === "card" ? String(cardMasked ?? "").trim() : undefined,
    });

    room.currentOccupancy = nextOccupancy;
    room.availabilityStatus = recalculateAvailability({
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity,
      status: room.availabilityStatus,
    });
    await room.save();

    await Notification.create({
      recipient: booking.student,
      actor: booking.student,
      type: "booking_confirmed",
      title: "Booking confirmed",
      message: "Your booking is confirmed.",
      booking: booking._id,
      read: false,
      meta: {
        roomId: room._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      },
    });

    return res.status(201).json({
      bookingId: booking._id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAllBookings = async (req, res) => {
  try {
    const deleted = await Booking.deleteMany({});
    await Notification.deleteMany({ booking: { $exists: true, $ne: null } });
    const rooms = await Room.find({});
    for (const room of rooms) {
      room.currentOccupancy = 0;
      room.availabilityStatus = recalculateAvailability({
        currentOccupancy: 0,
        capacity: room.capacity,
        status: room.availabilityStatus,
      });
      await room.save();
    }
    return res.status(200).json({
      message: "All bookings deleted successfully",
      deletedCount: deleted.deletedCount ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyLatestBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const booking = await Booking.findOne({
      student: req.user.id,
      bookingStatus: "confirmed",
    })
      .sort({ createdAt: -1 })
      .populate("room");

    if (!booking) {
      return res.status(200).json({ booking: null });
    }
    return res.status(200).json({
      booking: toBookingDto(booking),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const bookings = await Booking.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .populate("room");
    return res.status(200).json({
      data: bookings.map(toBookingDto),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBookingReceipt = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }
    const booking = await Booking.findOne({
      _id: req.params.id,
      student: req.user.id,
    }).populate("room");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.paymentStatus !== "completed") {
      return res.status(400).json({
        message: "Receipt is available only after completed payment",
      });
    }

    const receiptText = buildReceiptText(booking);
    return res.status(200).json({
      bookingId: booking._id,
      fileName: `booking-receipt-${booking._id}.pdf`,
      contentType: "application/pdf",
      content: receiptText,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }
    const booking = await Booking.findOne({
      _id: req.params.id,
      student: req.user.id,
    }).populate("room");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.bookingStatus !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be cancelled" });
    }

    const now = startOfToday();
    const deadline = new Date(booking.checkInDate);
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() - 1);
    if (now > deadline) {
      return res.status(400).json({
        message: "Cancellation is allowed only up to one day before check-in",
      });
    }

    booking.bookingStatus = "cancelled";
    await booking.save();

    const room = await Room.findById(booking.room?._id ?? booking.room);
    if (room) {
      room.currentOccupancy = Math.max(0, Number(room.currentOccupancy) - 1);
      room.availabilityStatus = recalculateAvailability({
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity,
        status: room.availabilityStatus,
      });
      await room.save();
    }

    await Notification.create({
      recipient: booking.student,
      actor: booking.student,
      type: "booking_confirmed",
      title: "Booking cancelled",
      message:
        "Your stay has been cancelled successfully. Payment will be reversed within 2 working days.",
      booking: booking._id,
      read: false,
      meta: {
        roomId: booking.room?._id ?? booking.room,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
      },
    });

    return res.status(200).json({
      message:
        "Booking cancelled successfully. Payment will be reversed within 2 working days.",
      booking: toBookingDto(booking),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const extendBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }
    const booking = await Booking.findOne({
      _id: req.params.id,
      student: req.user.id,
    }).populate("room");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.bookingStatus !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be extended" });
    }

    const {
      newCheckInDate,
      newCheckOutDate,
      paymentMethod,
      receipt,
      cardMasked,
    } = req.body ?? {};
    const nextCheckIn = newCheckInDate
      ? parseDateOrNull(newCheckInDate)
      : new Date(booking.checkInDate);
    const nextCheckOut = parseDateOrNull(newCheckOutDate);
    if (!nextCheckIn) {
      return res.status(400).json({ message: "newCheckInDate must be a valid date" });
    }
    if (!nextCheckOut) {
      return res.status(400).json({ message: "newCheckOutDate must be a valid date" });
    }
    if (nextCheckOut <= nextCheckIn) {
      return res.status(400).json({
        message: "New check-out date must be later than new check-in date",
      });
    }

    const msPerDay = 86400000;
    const originalDays = Math.max(
      1,
      Math.floor(
        (new Date(booking.checkOutDate).getTime() -
          new Date(booking.checkInDate).getTime()) /
          msPerDay,
      ),
    );
    const editedDays = Math.max(
      1,
      Math.floor((nextCheckOut.getTime() - nextCheckIn.getTime()) / msPerDay),
    );
    const extraDays = editedDays - originalDays;
    if (extraDays < 0) {
      return res.status(400).json({
        message: "Reducing stay duration is not allowed",
      });
    }

    let additionalRoomFees = 0;
    if (extraDays > 0) {
      if (!["card", "bank"].includes(paymentMethod)) {
        return res
          .status(400)
          .json({ message: "paymentMethod must be card or bank" });
      }
      if (paymentMethod === "bank" && !String(receipt?.uri ?? "").trim()) {
        return res
          .status(400)
          .json({ message: "Receipt is required for bank deposits" });
      }
      const monthly = Number(booking.room?.pricePerMonth ?? 0);
      additionalRoomFees = Math.round((monthly / 30) * extraDays);
      booking.paymentMethod = paymentMethod;
      booking.paymentStatus = "completed";
      booking.receipt =
        paymentMethod === "bank"
          ? {
              uri: String(receipt?.uri ?? "").trim(),
              name: String(receipt?.name ?? "").trim(),
              mimeType: String(receipt?.mimeType ?? "").trim(),
              size:
                receipt?.size === undefined || receipt?.size === null
                  ? undefined
                  : Number(receipt.size),
            }
          : undefined;
      booking.cardMasked =
        paymentMethod === "card" ? String(cardMasked ?? "").trim() : undefined;
    }

    booking.checkInDate = nextCheckIn;
    booking.checkOutDate = nextCheckOut;
    booking.stayDays = editedDays;
    booking.roomFees = Number(booking.roomFees ?? 0) + additionalRoomFees;
    booking.totalDue = Number(booking.totalDue ?? 0) + additionalRoomFees;
    booking.amountPaidByBooker = Number(booking.amountPaidByBooker ?? 0) + additionalRoomFees;
    await booking.save();

    await Notification.create({
      recipient: booking.student,
      actor: booking.student,
      type: "booking_confirmed",
      title: extraDays > 0 ? "Stay extended" : "Stay updated",
      message:
        extraDays > 0
          ? `Your stay has been extended to ${new Date(
              booking.checkOutDate,
            ).toLocaleDateString()}.`
          : "Your stay dates were updated successfully.",
      booking: booking._id,
      read: false,
      meta: {
        roomId: booking.room?._id ?? booking.room,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
      },
    });

    return res.status(200).json({
      message: "Booking extended successfully",
      additionalRoomFees,
      booking: toBookingDto(booking),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
