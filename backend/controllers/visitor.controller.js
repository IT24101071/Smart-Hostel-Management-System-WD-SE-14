import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import VisitorLog from "../models/VisitorLog.js";
import { uploadBufferToR2 } from "../utils/r2Upload.js";

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function computeStatus(log, now = new Date()) {
  if (log.status === "checked_out") return "checked_out";
  return new Date(log.expectedTimeOut) < now ? "overdue" : "checked_in";
}

async function findLatestConfirmedBooking(studentId) {
  return Booking.findOne({
    student: studentId,
    bookingStatus: "confirmed",
  })
    .sort({ createdAt: -1 })
    .populate("room", "roomNumber");
}

async function resolveStudent(studentName, studentIdOrRoom) {
  const normalizedName = sanitizeText(studentName);
  const normalizedLookup = sanitizeText(studentIdOrRoom);

  if (!normalizedName || !normalizedLookup) return null;

  const students = await User.find({
    role: "student",
    name: { $regex: escapeRegex(normalizedName), $options: "i" },
  }).select("name studentId");

  for (const student of students) {
    const booking = await findLatestConfirmedBooking(student._id);
    const roomNumber = sanitizeText(booking?.room?.roomNumber);
    const studentId = sanitizeText(student.studentId);
    if (normalizedLookup === studentId || normalizedLookup === roomNumber) {
      return {
        student,
        roomNumber,
      };
    }
  }
  return null;
}

function toVisitorDto(visitor, now = new Date()) {
  const computedStatus = computeStatus(visitor, now);
  return {
    id: visitor._id,
    fullName: visitor.fullName,
    nationalIdOrPassport: visitor.nationalIdOrPassport,
    idImageUrl: visitor.idImageUrl || "",
    contactNumber: visitor.contactNumber,
    studentRef: visitor.studentRef?._id ?? visitor.studentRef,
    studentNameSnapshot: visitor.studentNameSnapshot,
    studentIdSnapshot: visitor.studentIdSnapshot || "",
    studentRoomSnapshot: visitor.studentRoomSnapshot || "",
    relationshipToStudent: visitor.relationshipToStudent,
    purposeOfVisit: visitor.purposeOfVisit,
    expectedTimeOut: visitor.expectedTimeOut,
    checkInAt: visitor.checkInAt,
    checkOutAt: visitor.checkOutAt,
    status: computedStatus,
    persistedStatus: visitor.status,
    enteredBy: visitor.enteredBy?._id ?? visitor.enteredBy,
    createdAt: visitor.createdAt,
    updatedAt: visitor.updatedAt,
  };
}

export const checkInVisitor = async (req, res) => {
  try {
    const fullName = sanitizeText(req.body?.fullName);
    const nationalIdOrPassport = sanitizeText(req.body?.nationalIdOrPassport);
    const contactNumber = sanitizeText(req.body?.contactNumber);
    const studentName = sanitizeText(req.body?.studentName);
    const studentIdOrRoom = sanitizeText(req.body?.studentIdOrRoom);
    const relationshipToStudent = sanitizeText(req.body?.relationshipToStudent);
    const purposeOfVisit = sanitizeText(req.body?.purposeOfVisit);
    const expectedTimeOut = toIsoDate(req.body?.expectedTimeOut);

    if (
      !fullName ||
      !nationalIdOrPassport ||
      !contactNumber ||
      !studentName ||
      !studentIdOrRoom ||
      !relationshipToStudent ||
      !purposeOfVisit ||
      !expectedTimeOut
    ) {
      return res.status(400).json({
        message:
          "fullName, nationalIdOrPassport, contactNumber, studentName, studentIdOrRoom, relationshipToStudent, purposeOfVisit, and expectedTimeOut are required",
      });
    }

    if (expectedTimeOut <= new Date()) {
      return res.status(400).json({ message: "Expected time out must be in the future" });
    }

    const studentMatch = await resolveStudent(studentName, studentIdOrRoom);
    if (!studentMatch) {
      return res.status(400).json({
        message: "Student verification failed. Check name with matching student ID or room number.",
      });
    }

    const duplicateWindowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const duplicate = await VisitorLog.findOne({
      nationalIdOrPassport,
      studentRef: studentMatch.student._id,
      status: "checked_in",
      checkInAt: { $gte: duplicateWindowStart },
    });
    if (duplicate) {
      return res.status(409).json({
        message: "This visitor already has an active recent check-in for the selected student",
      });
    }

    let idImageUrl = "";
    if (req.file) {
      idImageUrl = await uploadBufferToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "visitor-ids",
      );
    }

    const created = await VisitorLog.create({
      fullName,
      nationalIdOrPassport,
      idImageUrl,
      contactNumber,
      studentRef: studentMatch.student._id,
      studentNameSnapshot: studentMatch.student.name,
      studentIdSnapshot: sanitizeText(studentMatch.student.studentId),
      studentRoomSnapshot: studentMatch.roomNumber,
      relationshipToStudent,
      purposeOfVisit,
      expectedTimeOut,
      checkInAt: new Date(),
      status: "checked_in",
      enteredBy: req.user.id,
    });

    return res.status(201).json({
      message: "Visitor checked in successfully",
      data: toVisitorDto(created),
    });
  } catch (error) {
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to check in visitor" });
  }
};

export const checkOutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid visitor log id" });
    }

    const visitor = await VisitorLog.findById(id);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    if (visitor.status !== "checked_in") {
      return res.status(400).json({ message: "Only checked-in visitors can be checked out" });
    }

    visitor.status = "checked_out";
    visitor.checkOutAt = new Date();
    await visitor.save();

    return res.status(200).json({
      message: "Visitor checked out successfully",
      data: toVisitorDto(visitor),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to check out visitor" });
  }
};

export const updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid visitor log id" });
    }

    const visitor = await VisitorLog.findById(id);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    if (visitor.status !== "checked_in") {
      return res.status(400).json({ message: "Only checked-in visitors can be edited" });
    }

    const fullName = sanitizeText(req.body?.fullName);
    const nationalIdOrPassport = sanitizeText(req.body?.nationalIdOrPassport);
    const contactNumber = sanitizeText(req.body?.contactNumber);
    const relationshipToStudent = sanitizeText(req.body?.relationshipToStudent);
    const purposeOfVisit = sanitizeText(req.body?.purposeOfVisit);
    const expectedTimeOut = toIsoDate(req.body?.expectedTimeOut);

    if (
      !fullName ||
      !nationalIdOrPassport ||
      !contactNumber ||
      !relationshipToStudent ||
      !purposeOfVisit ||
      !expectedTimeOut
    ) {
      return res.status(400).json({
        message:
          "fullName, nationalIdOrPassport, contactNumber, relationshipToStudent, purposeOfVisit, and expectedTimeOut are required",
      });
    }

    if (expectedTimeOut <= new Date()) {
      return res.status(400).json({ message: "Expected time out must be in the future" });
    }

    visitor.fullName = fullName;
    visitor.nationalIdOrPassport = nationalIdOrPassport;
    visitor.contactNumber = contactNumber;
    visitor.relationshipToStudent = relationshipToStudent;
    visitor.purposeOfVisit = purposeOfVisit;
    visitor.expectedTimeOut = expectedTimeOut;
    await visitor.save();

    return res.status(200).json({
      message: "Visitor details updated successfully",
      data: toVisitorDto(visitor),
    });
  } catch (error) {
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to update visitor details" });
  }
};

export const getVisitors = async (req, res) => {
  try {
    const q = sanitizeText(req.query?.search);
    const status = sanitizeText(req.query?.status);
    const student = sanitizeText(req.query?.student);
    const from = toIsoDate(req.query?.from);
    const to = toIsoDate(req.query?.to);
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && ["checked_in", "checked_out", "overdue"].includes(status)) {
      if (status === "overdue") {
        filter.status = "checked_in";
        filter.expectedTimeOut = { $lt: new Date() };
      } else {
        filter.status = status;
      }
    }

    if (student) {
      filter.$or = [
        { studentNameSnapshot: { $regex: escapeRegex(student), $options: "i" } },
        { studentIdSnapshot: { $regex: escapeRegex(student), $options: "i" } },
        { studentRoomSnapshot: { $regex: escapeRegex(student), $options: "i" } },
      ];
    }

    if (q) {
      filter.$and = [
        ...(Array.isArray(filter.$and) ? filter.$and : []),
        {
          $or: [
            { fullName: { $regex: escapeRegex(q), $options: "i" } },
            { nationalIdOrPassport: { $regex: escapeRegex(q), $options: "i" } },
            { contactNumber: { $regex: escapeRegex(q), $options: "i" } },
          ],
        },
      ];
    }

    if (from || to) {
      filter.checkInAt = {};
      if (from) filter.checkInAt.$gte = from;
      if (to) filter.checkInAt.$lte = to;
    }

    const [rows, total] = await Promise.all([
      VisitorLog.find(filter)
        .sort({ checkInAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("studentRef", "name studentId")
        .populate("enteredBy", "name email role"),
      VisitorLog.countDocuments(filter),
    ]);

    const now = new Date();
    const data = rows.map((row) => toVisitorDto(row, now));
    const meta = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };

    return res.status(200).json({ data, meta });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch visitors" });
  }
};

export const getRoomStudents = async (req, res) => {
  try {
    const roomNumber = sanitizeText(req.query?.roomNumber);
    if (!roomNumber) {
      return res.status(400).json({ message: "roomNumber is required" });
    }

    const bookings = await Booking.find({
      bookingStatus: "confirmed",
    })
      .sort({ createdAt: -1 })
      .populate("room", "roomNumber")
      .populate("student", "name studentId");

    const normalized = roomNumber.toLowerCase();
    const matches = bookings.filter((booking) => {
      const bookingRoom = sanitizeText(booking?.room?.roomNumber).toLowerCase();
      return bookingRoom === normalized;
    });

    const dedup = new Map();
    for (const booking of matches) {
      const student = booking?.student;
      const studentId = String(student?._id ?? "");
      if (!studentId || dedup.has(studentId)) continue;
      dedup.set(studentId, {
        id: studentId,
        name: sanitizeText(student?.name),
        studentId: sanitizeText(student?.studentId),
        roomNumber: sanitizeText(booking?.room?.roomNumber),
      });
    }

    return res.status(200).json({
      data: Array.from(dedup.values()),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch room students" });
  }
};

export const getActiveVisitorRooms = async (req, res) => {
  try {
    const rooms = await Room.find({})
      .select("roomNumber")
      .sort({ roomNumber: 1 });

    return res.status(200).json({
      data: rooms
        .map((room) => ({
          roomNumber: sanitizeText(room?.roomNumber),
        }))
        .filter((room) => Boolean(room.roomNumber)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch active rooms" });
  }
};
