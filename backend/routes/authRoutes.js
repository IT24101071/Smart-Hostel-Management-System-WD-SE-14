import express from "express";
import {
  register,
  login,
  getMe,
  getPendingUsers,
  approveUser,
  getAllUsers,
} from "../controllers/authController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/pending", protect, adminOnly, getPendingUsers);
router.patch("/approve/:id", protect, adminOnly, approveUser);
router.get("/users", protect, adminOnly, getAllUsers);

export default router;
