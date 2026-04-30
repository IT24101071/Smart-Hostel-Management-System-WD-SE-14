import express from "express";
import {
  getActiveVisitorRooms,
  checkInVisitor,
  checkOutVisitor,
  updateVisitor,
  getVisitors,
  getRoomStudents,
} from "../controllers/visitor.controller.js";
import { protect, wardenOrAdmin } from "../middleware/auth.middleware.js";
import { handleUploadError, uploadRoomImages } from "../middleware/r2.middleware.js";

const router = express.Router();

router.get("/", protect, wardenOrAdmin, getVisitors);
router.get("/active-rooms", protect, wardenOrAdmin, getActiveVisitorRooms);
router.get("/room-students", protect, wardenOrAdmin, getRoomStudents);
router.post(
  "/check-in",
  protect,
  wardenOrAdmin,
  uploadRoomImages.single("idImage"),
  handleUploadError,
  checkInVisitor,
);
router.patch("/:id", protect, wardenOrAdmin, updateVisitor);
router.patch("/:id/check-out", protect, wardenOrAdmin, checkOutVisitor);

export default router;
