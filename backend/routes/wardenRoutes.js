import express from "express";
import { getWardenStats, searchStaff, deleteUser } from "../controllers/wardenController.js";
import { protect, wardenOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply security to all warden routes
router.use(protect, wardenOrAdmin);

router.get("/stats", getWardenStats);
router.get("/search", searchStaff);
router.delete("/user/:id", deleteUser);

export default router;