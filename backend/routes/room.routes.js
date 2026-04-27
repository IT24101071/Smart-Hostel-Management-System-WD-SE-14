import express from "express";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} from "../controllers/room.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import {
  uploadRoomImages,
  handleUploadError,
} from "../middleware/r2.middleware.js";

const router = express.Router();

router.get("/", getRooms);
router.get("/:id", getRoomById);

router.post(
  "/",
  protect,
  adminOnly,
  uploadRoomImages.array("images", 5),
  handleUploadError,
  createRoom,
);

router.put(
  "/:id",
  protect,
  adminOnly,
  uploadRoomImages.array("images", 5),
  handleUploadError,
  updateRoom,
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteRoom,
);

export default router;
