import multer from "multer";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  let mime = (file.mimetype || "").toLowerCase().trim();
  if (mime === "image/jpg") mime = "image/jpeg";

  if (ALLOWED_MIMES.includes(mime)) {
    return cb(null, true);
  }

  // Browsers often send application/octet-stream or empty mimetype for picked files
  const name = (file.originalname || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (ext && EXT_TO_MIME[ext]) {
    file.mimetype = EXT_TO_MIME[ext];
    return cb(null, true);
  }

  cb(new Error("Only jpeg, png, and webp image formats are allowed"));
};

export const uploadRoomImages = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

export const handleUploadError = (error, req, res, next) => {
  if (!error) return next();

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Maximum 5 images are allowed" });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "Each image must be smaller than 5MB" });
    }
  }

  return res.status(400).json({ message: error.message || "Upload failed" });
};
