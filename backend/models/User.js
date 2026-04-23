import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "warden", "admin"],
      default: "student",
    },
    isApproved: { type: Boolean, default: false },

    gender: {
      type: String,
      enum: ["male", "female"],
    },

    // student specific fields
    studentId: { type: String },
    year: { type: Number },
    semester: { type: Number },
    contactNo: { type: String },
    guardianName: { type: String },
    guardianContact: { type: String },
    profileImage: { type: String },
    idCardImage: { type: String },
    lastLoginAt: { type: Date },
    lastActionAt: { type: Date },
    lastAction: { type: String },

    passwordResetOtpHash: { type: String, select: false },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
