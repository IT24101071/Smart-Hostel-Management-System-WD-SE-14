import mongoose from "mongoose";

export const TICKET_CATEGORIES = ["Plumbing", "Electrical", "Wi-Fi", "Other"];
export const TICKET_URGENCY = ["Low", "Medium", "High"];
export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

const ticketStatusLogSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: TICKET_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const ticketImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    urgency: {
      type: String,
      enum: TICKET_URGENCY,
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "Open",
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    imageName: {
      type: String,
      trim: true,
      default: "",
    },
    images: {
      type: [ticketImageSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 5,
        message: "Maximum 5 images are allowed",
      },
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: undefined,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    statusLog: {
      type: [ticketStatusLogSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Ticket", ticketSchema);
