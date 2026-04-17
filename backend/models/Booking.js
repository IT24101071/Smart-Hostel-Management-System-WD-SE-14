import mongoose from "mongoose";

const peerSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, trim: true, lowercase: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    respondedAt: { type: Date, default: undefined },
  },
  { _id: false },
);

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
    paymentSplitMode: {
      type: String,
      enum: ["single", "split"],
      default: "single",
    },
    amountPaidByBooker: { type: Number, required: true, min: 0, default: 0 },
    amountPendingFromPeers: { type: Number, required: true, min: 0, default: 0 },
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
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "pending",
    },
    peers: {
      type: [peerSchema],
      default: [],
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
