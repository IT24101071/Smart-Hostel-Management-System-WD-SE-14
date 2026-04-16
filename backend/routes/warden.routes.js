import express from "express";
import {
  getWardenStats,
  searchStaff,
  deleteUser,
} from "../controllers/wardenController.js";
import { protect, wardenOrAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, wardenOrAdmin);

router.get("/stats", getWardenStats);
router.get("/search", searchStaff);
router.delete("/user/:id", deleteUser);

export default router;
