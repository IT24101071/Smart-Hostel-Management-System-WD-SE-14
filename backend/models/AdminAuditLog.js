import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["create_admin", "update_admin", "delete_admin"],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    details: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("AdminAuditLog", adminAuditLogSchema);
