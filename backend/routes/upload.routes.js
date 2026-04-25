import express from "express";
import { upload } from "../utils/upload.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/receipt", protect, upload.single("receipt"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Return the path that can be used to access the file
  const fileUrl = `/uploads/receipts/${req.file.filename}`;
  
  res.status(200).json({
    message: "File uploaded successfully",
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

export default router;
