import mongoose from "mongoose";

const signupOtpSessionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    payload: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      passwordHash: { type: String, required: true, select: false },
      studentId: { type: String },
      year: { type: Number },
      semester: { type: Number },
      contactNo: { type: String },
      guardianName: { type: String },
      guardianContact: { type: String },
      gender: { type: String, enum: ["male", "female"], required: true },
      profileImage: { type: String },
      idCardImage: { type: String },
    },
  },
  { timestamps: true },
);

signupOtpSessionSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("SignupOtpSession", signupOtpSessionSchema);
