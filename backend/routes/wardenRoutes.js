import express from "express";
import { getAllStaff, addStaff } from "../controllers/wardenController.js";
import { protect, wardenOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Applyingjk the security guard Chamal created
router.route("/staff")
    .get(protect, wardenOrAdmin, getAllStaff)
    .post(protect, wardenOrAdmin, addStaff);

export default router;