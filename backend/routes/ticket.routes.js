import express from "express";
import {
  addTicketNote,
  assignTicket,
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  getTicketImageUrls,
  updateTicketStatus,
} from "../controllers/ticket.controller.js";
import { protect, wardenOrAdmin } from "../middleware/auth.middleware.js";
import { handleUploadError, uploadRoomImages } from "../middleware/r2.middleware.js";

const router = express.Router();

router.get("/me", protect, getMyTickets);
router.get("/", protect, wardenOrAdmin, getAllTickets);
router.get("/:id", protect, getTicketById);
router.get("/:id/image-urls", protect, getTicketImageUrls);
router.patch("/:id/status", protect, wardenOrAdmin, updateTicketStatus);
router.patch("/:id/assign", protect, wardenOrAdmin, assignTicket);
router.post("/:id/notes", protect, addTicketNote);
router.post("/", protect, uploadRoomImages.array("images", 5), handleUploadError, createTicket);

export default router;
