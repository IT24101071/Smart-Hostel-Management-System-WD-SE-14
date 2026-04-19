import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ["Single", "Double", "Triple"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    pricePerMonth: {
      type: Number,
      required: true,
      min: 0,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Full", "Maintenance"],
      default: "Available",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
