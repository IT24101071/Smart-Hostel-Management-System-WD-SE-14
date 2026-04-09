import Room from "../models/Room.js";
import { uploadMultipleToR2 } from "../utils/r2Upload.js";

const ROOM_TYPES = ["Single", "Double", "Triple"];
const AVAILABILITY_TYPES = ["Available", "Full", "Maintenance"];

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
    const { roomNumber, roomType, pricePerMonth, capacity, description } =
      req.body;

    if (!roomNumber) {
      return res.status(400).json({ message: "roomNumber is required" });
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

    const imageUrls = await uploadMultipleToR2(req.files || []);

    const room = await Room.create({
      roomNumber,
      roomType,
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
    const { roomType, availabilityStatus, page = 1, limit = 10 } = req.query;

    const filter = {};
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
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const {
      pricePerMonth,
      capacity,
      description,
      roomType,
      availabilityStatus,
      imageAction = "append",
    } = req.body;

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

    if (req.files?.length) {
      const uploadedUrls = await uploadMultipleToR2(req.files);

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
