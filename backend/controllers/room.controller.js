import Room from "../models/Room.js";
import { uploadMultipleToR2 } from "../utils/r2Upload.js";

const ROOM_TYPES = ["Single", "Double", "Triple"];
const AVAILABILITY_TYPES = ["Available", "Full", "Maintenance"];
const GENDERS = ["male", "female"];

const toPositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const recalculateAvailability = ({ currentOccupancy, capacity, status }) => {
  if (status === "Maintenance") return "Maintenance";
  return currentOccupancy >= capacity ? "Full" : "Available";
};

export const createRoom = async (req, res) => {
  try {
    console.log(
      "[createRoom] Files received:",
      req.files?.length || 0,
      "files",
    );
    console.log("[createRoom] Request body:", req.body);

    const { roomNumber, roomType, pricePerMonth, capacity, description, gender } =
      req.body;

    if (!roomNumber) {
      return res.status(400).json({ message: "roomNumber is required" });
    }

    if (!gender || !GENDERS.includes(gender)) {
      return res
        .status(400)
        .json({ message: "gender is required and must be male or female" });
    }

    if (!ROOM_TYPES.includes(roomType)) {
      return res.status(400).json({ message: "Invalid roomType" });
    }

    const parsedPrice = toPositiveNumber(pricePerMonth);
    const parsedCapacity = toPositiveNumber(capacity);

    if (!parsedPrice || parsedPrice <= 0) {
      return res.status(400).json({ message: "pricePerMonth must be > 0" });
    }

    if (!parsedCapacity || parsedCapacity <= 0) {
      return res.status(400).json({ message: "capacity must be > 0" });
    }

    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(409).json({ message: "roomNumber already exists" });
    }

    console.log(
      "[createRoom] Uploading",
      req.files?.length || 0,
      "files to R2",
    );
    const imageUrls = await uploadMultipleToR2(req.files || []);
    console.log("[createRoom] Uploaded URLs:", imageUrls);

    const room = await Room.create({
      roomNumber,
      roomType,
      gender,
      pricePerMonth: parsedPrice,
      capacity: parsedCapacity,
      currentOccupancy: 0,
      description,
      images: imageUrls,
      availabilityStatus: "Available",
    });

    return res.status(201).json(room);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "roomNumber already exists" });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const getRooms = async (req, res) => {
  try {
    const {
      roomType,
      availabilityStatus,
      gender,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};
    if (gender) {
      if (!GENDERS.includes(gender)) {
        return res.status(400).json({ message: "Invalid gender filter" });
      }
      filter.gender = gender;
    }
    if (roomType) {
      if (!ROOM_TYPES.includes(roomType)) {
        return res.status(400).json({ message: "Invalid roomType filter" });
      }
      filter.roomType = roomType;
    }
    if (availabilityStatus) {
      if (!AVAILABILITY_TYPES.includes(availabilityStatus)) {
        return res
          .status(400)
          .json({ message: "Invalid availabilityStatus filter" });
      }
      filter.availabilityStatus = availabilityStatus;
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const [rooms, total] = await Promise.all([
      Room.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
      Room.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: rooms,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    return res.status(200).json(room);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    console.log(
      "[updateRoom] Files received:",
      req.files?.length || 0,
      "files",
    );
    console.log("[updateRoom] Request body:", req.body);

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const {
      pricePerMonth,
      capacity,
      description,
      roomType,
      availabilityStatus,
      gender,
      imageAction = "append",
      keptImageUrls: keptImageUrlsRaw,
    } = req.body;

    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) {
        return res.status(400).json({ message: "Invalid gender" });
      }
      room.gender = gender;
    }

    if (pricePerMonth !== undefined) {
      const parsedPrice = toPositiveNumber(pricePerMonth);
      if (!parsedPrice || parsedPrice <= 0) {
        return res.status(400).json({ message: "pricePerMonth must be > 0" });
      }
      room.pricePerMonth = parsedPrice;
    }

    if (roomType !== undefined) {
      if (!ROOM_TYPES.includes(roomType)) {
        return res.status(400).json({ message: "Invalid roomType" });
      }
      room.roomType = roomType;
    }

    if (capacity !== undefined) {
      const parsedCapacity = toPositiveNumber(capacity);
      if (!parsedCapacity || parsedCapacity <= 0) {
        return res.status(400).json({ message: "capacity must be > 0" });
      }
      if (parsedCapacity < room.currentOccupancy) {
        return res
          .status(400)
          .json({ message: "capacity cannot be less than currentOccupancy" });
      }
      room.capacity = parsedCapacity;
    }

    if (description !== undefined) {
      room.description = description;
    }

    if (availabilityStatus !== undefined) {
      if (!AVAILABILITY_TYPES.includes(availabilityStatus)) {
        return res.status(400).json({ message: "Invalid availabilityStatus" });
      }
      room.availabilityStatus = availabilityStatus;
    }

    const hasKeptPayload = Object.prototype.hasOwnProperty.call(
      req.body,
      "keptImageUrls",
    );

    if (hasKeptPayload) {
      let kept = [];
      try {
        const parsed = JSON.parse(keptImageUrlsRaw || "[]");
        if (Array.isArray(parsed)) kept = parsed;
      } catch {
        kept = [];
      }
      const previous = new Set(room.images || []);
      const seen = new Set();
      const keptValid = kept.filter((u) => {
        if (typeof u !== "string" || !previous.has(u) || seen.has(u))
          return false;
        seen.add(u);
        return true;
      });

      let uploadedUrls = [];
      if (req.files?.length) {
        uploadedUrls = await uploadMultipleToR2(req.files);
      }

      room.images = [...keptValid, ...uploadedUrls];

      if (room.images.length > 5) {
        return res
          .status(400)
          .json({ message: "A room can have a maximum of 5 images" });
      }
    } else if (req.files?.length) {
      console.log("[updateRoom] Uploading", req.files.length, "files to R2");
      const uploadedUrls = await uploadMultipleToR2(req.files);
      console.log("[updateRoom] Uploaded URLs:", uploadedUrls);

      if (imageAction === "replace") {
        room.images = uploadedUrls;
      } else {
        room.images = [...room.images, ...uploadedUrls];
      }

      if (room.images.length > 5) {
        return res
          .status(400)
          .json({ message: "A room can have a maximum of 5 images" });
      }
    } else {
      console.log("[updateRoom] No files to upload");
    }

    if (room.currentOccupancy > room.capacity) {
      return res
        .status(400)
        .json({ message: "currentOccupancy cannot be greater than capacity" });
    }

    room.availabilityStatus = recalculateAvailability({
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity,
      status: room.availabilityStatus,
    });

    await room.save();
    return res.status(200).json(room);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.currentOccupancy > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete room with current occupants" });
    }

    await room.deleteOne();
    return res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
