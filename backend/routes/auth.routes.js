import express from "express";
import {
  register,
  login,
  getMe,
  getPendingUsers,
  getApprovedStudents,
  getWardens,
  approveStudent,
  createAdmin,
  createWarden,
  getAllUsers,
  deleteUser,
  updateUser,
} from "../controllers/auth.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import {
  uploadRoomImages,
  handleUploadError,
} from "../middleware/r2.middleware.js";

const router = express.Router();

router.post(
  "/register",
  uploadRoomImages.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "idCardImage", maxCount: 1 },
  ]),
  handleUploadError,
  register,
);
router.post("/login", login);

router.post("/create-admin", createAdmin);

router.get("/me", protect, getMe);

router.get("/pending", protect, adminOnly, getPendingUsers);
router.get("/students/approved", protect, adminOnly, getApprovedStudents);
router.get("/wardens", protect, adminOnly, getWardens);
router.patch("/approve/:id", protect, adminOnly, approveStudent);
router.post("/create-warden", protect, adminOnly, createWarden);
router.get("/users", protect, adminOnly, getAllUsers);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.patch("/users/:id", protect, adminOnly, updateUser);

export default router;
