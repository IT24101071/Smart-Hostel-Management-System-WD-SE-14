import mongoose from "mongoose";

const inviteeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contact: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    respondedAt: { type: Date, default: undefined },
  },
  { _id: false },
);

const peerInviteSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitees: {
      type: [inviteeSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "ready", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

export default mongoose.model("PeerInvite", peerInviteSchema);
