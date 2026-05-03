import express from "express";
import {
  getWardenStats,
  searchStaff,
  deleteUser,
  getStudentList,
  getStaffList,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from "../controllers/wardenController.js";
import { protect, wardenOrAdmin } from "../middleware/auth.middleware.js";
import { optionalNicPhotoFields } from "../middleware/r2.middleware.js";

const router = express.Router();

router.use(protect, wardenOrAdmin);

router.get("/stats", getWardenStats);
router.get("/search", searchStaff);
router.get("/students", getStudentList);
router.get("/staff", getStaffList);
router.post("/staff", optionalNicPhotoFields, createStaff);
router.patch("/staff/:id", optionalNicPhotoFields, updateStaff);
router.patch("/staff/:id/status", toggleStaffStatus);
router.delete("/staff/:id", deleteStaff);
router.delete("/user/:id", deleteUser);

export default router;
