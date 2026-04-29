import mongoose from "mongoose";

export const VISITOR_STATUSES = ["checked_in", "checked_out", "overdue"];

const visitorLogSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    nationalIdOrPassport: { type: String, required: true, trim: true, index: true },
    idImageUrl: { type: String, trim: true, default: "" },
    contactNumber: { type: String, required: true, trim: true },

    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentNameSnapshot: { type: String, required: true, trim: true },
    studentIdSnapshot: { type: String, trim: true, default: "" },
    studentRoomSnapshot: { type: String, trim: true, default: "" },

    relationshipToStudent: { type: String, required: true, trim: true },
    purposeOfVisit: { type: String, required: true, trim: true },

    expectedTimeOut: { type: Date, required: true, index: true },
    checkInAt: { type: Date, required: true, default: Date.now, index: true },
    checkOutAt: { type: Date, default: null },
    status: {
      type: String,
      enum: VISITOR_STATUSES,
      default: "checked_in",
      index: true,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("VisitorLog", visitorLogSchema);
