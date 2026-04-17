import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    uri: { type: String, trim: true },
    name: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    stayDays: { type: Number, required: true, min: 1 },
    roomFees: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    amountPaidByBooker: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["card", "bank"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "submitted", "confirmed", "completed", "failed"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    receipt: {
      type: receiptSchema,
      default: undefined,
    },
    cardMasked: { type: String, trim: true, default: undefined },
  },
  { timestamps: true },
);

export default mongoose.model("Booking", bookingSchema);
