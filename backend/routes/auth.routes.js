import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateMyProfile,
  changePassword,
  deleteMyAccount,
  getPendingUsers,
  getApprovedStudents,
  getWardens,
  approveStudent,
  createAdmin,
  createWarden,
  getAllUsers,
  deleteUser,
  updateUser,
  getAdminAuditLogs,
  getAdminMetrics,
} from "../controllers/auth.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import {
  uploadRoomImages,
  handleUploadError,
} from "../middleware/r2.middleware.js";

const router = express.Router();

/** Multer only for multipart (photo upload). JSON PATCH skips multer so RN/axios can save text fields reliably. */
function patchMeUpload(req, res, next) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    const upload = uploadRoomImages.fields([
      { name: "profileImage", maxCount: 1 },
    ]);
    return upload(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  }
  next();
}

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
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/create-admin", protect, adminOnly, createAdmin);

router.get("/me", protect, getMe);
router.patch("/me", protect, patchMeUpload, updateMyProfile);
router.post("/change-password", protect, changePassword);
router.delete("/account", protect, deleteMyAccount);

router.get("/pending", protect, adminOnly, getPendingUsers);
router.get("/students/approved", protect, adminOnly, getApprovedStudents);
router.get("/wardens", protect, adminOnly, getWardens);
router.patch("/approve/:id", protect, adminOnly, approveStudent);
router.post("/create-warden", protect, adminOnly, createWarden);
router.get("/users", protect, adminOnly, getAllUsers);
router.get("/admin-audit-logs", protect, adminOnly, getAdminAuditLogs);
router.get("/admin-metrics", protect, adminOnly, getAdminMetrics);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.patch("/users/:id", protect, adminOnly, updateUser);

export default router;
