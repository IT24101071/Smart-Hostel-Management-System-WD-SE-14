import Booking from "../models/Booking.js";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Ticket, {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_URGENCY,
} from "../models/Ticket.js";
import User from "../models/User.js";
import { uploadBufferToR2, extractKeyFromUrl, getPresignedUrl } from "../utils/r2Upload.js";

const STAFF_ROLES = ["admin", "warden"];
const ALLOWED_TRANSITIONS = {
  Open: ["In Progress"],
  "In Progress": ["Resolved"],
  Resolved: ["In Progress"],
  Closed: [],
};
const TICKET_POPULATE_SELECT = {
  room: "roomNumber",
  user: "name email",
  userWithRole: "name email role",
};

function normalizeRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function respondControllerError(error, res) {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({ message: error.message || "Internal server error" });
}

function requireAuthenticatedUser(req, res) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Not authorized" });
    return false;
  }
  return true;
}

function requireStudent(req, res) {
  if (!requireAuthenticatedUser(req, res)) return false;
  if (normalizeRole(req.user.role) !== "student") {
    res.status(403).json({ message: "Student access only" });
    return false;
  }
  return true;
}

function populateTicketQuery(query) {
  return query
    .populate("room", TICKET_POPULATE_SELECT.room)
    .populate("createdBy", TICKET_POPULATE_SELECT.user)
    .populate("assignedTo", TICKET_POPULATE_SELECT.user)
    .populate("statusLog.changedBy", TICKET_POPULATE_SELECT.user);
}

function toTicketDto(ticket) {
  const images = Array.isArray(ticket.images) ? ticket.images : [];
  return {
    id: ticket._id,
    ticketNumber: ticket.ticketNumber,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
    urgency: ticket.urgency,
    status: ticket.status,
    imageUrl: ticket.imageUrl || "",
    imageName: ticket.imageName || "",
    images: images.map((image) => ({
      url: image.url || "",
      name: image.name || "",
    })),
    room: ticket.room
      ? {
          id: ticket.room._id ?? ticket.room.id,
          roomNumber: ticket.room.roomNumber,
        }
      : null,
    createdBy: ticket.createdBy
      ? {
          id: ticket.createdBy._id ?? ticket.createdBy.id,
          name: ticket.createdBy.name,
          email: ticket.createdBy.email,
        }
      : null,
    assignedTo: ticket.assignedTo
      ? {
          id: ticket.assignedTo._id ?? ticket.assignedTo.id,
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        }
      : null,
    statusLog: Array.isArray(ticket.statusLog)
      ? ticket.statusLog.map((entry) => ({
          status: entry.status,
          changedAt: entry.changedAt,
          note: entry.note,
          changedBy: entry.changedBy
            ? {
                id: entry.changedBy._id ?? entry.changedBy.id,
                name: entry.changedBy.name,
                email: entry.changedBy.email,
              }
            : null,
        }))
      : [],
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function buildTicketNumber(id, createdAt) {
  const date = new Date(createdAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `TKT-${y}${m}${d}-${String(id).slice(-6).toUpperCase()}`;
}

async function findLatestConfirmedBooking(studentId) {
  return Booking.findOne({
    student: studentId,
    bookingStatus: "confirmed",
  })
    .sort({ createdAt: -1 })
    .populate("room");
}

async function findCurrentOrLatestConfirmedBooking(studentId) {
  const now = new Date();
  const currentBooking = await Booking.findOne({
    student: studentId,
    bookingStatus: "confirmed",
    checkInDate: { $lte: now },
    checkOutDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .populate("room");

  if (currentBooking) return currentBooking;
  return findLatestConfirmedBooking(studentId);
}

function parseTicketFilters(query) {
  const { status, category, urgency, search } = query;
  const filter = {};

  if (status) {
    if (!TICKET_STATUSES.includes(status)) return { error: "Invalid ticket status filter" };
    filter.status = status;
  }
  if (category) {
    if (!TICKET_CATEGORIES.includes(category))
      return { error: "Invalid ticket category filter" };
    filter.category = category;
  }
  if (urgency) {
    if (!TICKET_URGENCY.includes(urgency)) return { error: "Invalid urgency filter" };
    filter.urgency = urgency;
  }
  if (search) {
    const q = String(search).trim();
    if (q) {
      filter.$or = [
        { subject: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { ticketNumber: { $regex: q, $options: "i" } },
      ];
    }
  }

  return { filter };
}

function getUploadFailureMessage(error) {
  const raw = String(error?.message || "").toLowerCase();
  if (
    raw.includes("unauthorized") ||
    raw.includes("accessdenied") ||
    raw.includes("invalidaccesskeyid") ||
    raw.includes("signaturedoesnotmatch")
  ) {
    return "Ticket image upload failed (R2 authorization). Check R2 keys/bucket settings.";
  }
  return "Ticket image upload failed. Please try again.";
}

async function notifyStudentTicketCreated(ticket) {
  await Notification.create({
    recipient: ticket.createdBy,
    actor: ticket.createdBy,
    type: "ticket_created",
    title: "Ticket submitted",
    message: `Your ticket ${ticket.ticketNumber} has been submitted and is now Open.`,
    ticket: ticket._id,
    read: false,
    meta: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    },
  });
}

async function notifyStudentTicketStatusUpdated(ticket, actorId, previousStatus) {
  if (ticket.status !== "Resolved") return;
  await Notification.create({
    recipient: ticket.createdBy?._id ?? ticket.createdBy,
    actor: actorId,
    type: "ticket_status_updated",
    title: "Ticket resolved",
    message: `Your ticket ${ticket.ticketNumber} moved from ${previousStatus} to ${ticket.status}.`,
    ticket: ticket._id,
    read: false,
    meta: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      previousStatus,
      currentStatus: ticket.status,
    },
  });
}

async function notifyStudentTicketNote(ticket, actorId, note) {
  const normalizedNote = String(note || "").trim().replace(/\s+/g, " ");
  const preview =
    normalizedNote.length > 80
      ? `${normalizedNote.slice(0, 77)}...`
      : normalizedNote;
  await Notification.create({
    recipient: ticket.createdBy?._id ?? ticket.createdBy,
    actor: actorId,
    type: "ticket_note_added",
    title: "Update on your ticket",
    message: `Your ticket ${ticket.ticketNumber} has a new update: ${preview}`,
    ticket: ticket._id,
    read: false,
    meta: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      note,
      status: ticket.status,
    },
  });
}

export const createTicket = async (req, res) => {
  try {
    if (!requireStudent(req, res)) return;

    const category = sanitizeText(req.body?.category);
    const subject = sanitizeText(req.body?.subject);
    const description = sanitizeText(req.body?.description);
    const urgency = sanitizeText(req.body?.urgency) || "Medium";

    if (!TICKET_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid ticket category" });
    }
    if (!subject || subject.length < 5) {
      return res
        .status(400)
        .json({ message: "Subject must be at least 5 characters long" });
    }
    if (!description || description.length < 10) {
      return res
        .status(400)
        .json({ message: "Description must be at least 10 characters long" });
    }
    if (!TICKET_URGENCY.includes(urgency)) {
      return res.status(400).json({ message: "Invalid urgency level" });
    }

    const uploadedImages = [];
    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
    try {
      for (const file of files) {
        const url = await uploadBufferToR2(
          file.buffer,
          file.originalname,
          file.mimetype,
          "tickets",
        );
        uploadedImages.push({
          url,
          name: file.originalname ?? "ticket-image",
        });
      }
    } catch (uploadError) {
      return res.status(502).json({ message: getUploadFailureMessage(uploadError) });
    }

    const latestBooking = await findCurrentOrLatestConfirmedBooking(req.user.id);
    const roomId = latestBooking?.room?._id ?? undefined;

    const ticketId = new mongoose.Types.ObjectId();
    const ticketNumber = buildTicketNumber(ticketId, new Date());

    const ticket = await Ticket.create({
      _id: ticketId,
      ticketNumber,
      category,
      subject,
      description,
      urgency,
      status: "Open",
      imageUrl: uploadedImages[0]?.url ?? "",
      imageName: uploadedImages[0]?.name ?? "",
      images: uploadedImages,
      room: roomId,
      createdBy: req.user.id,
      statusLog: [
        {
          status: "Open",
          changedBy: req.user.id,
          note: "Ticket created by student",
        },
      ],
    });

    await notifyStudentTicketCreated(ticket);

    const saved = await populateTicketQuery(Ticket.findById(ticket._id));

    return res.status(201).json({ ticket: toTicketDto(saved) });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const getMyTickets = async (req, res) => {
  try {
    if (!requireStudent(req, res)) return;

    const tickets = await populateTicketQuery(
      Ticket.find({ createdBy: req.user.id }),
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      data: tickets.map(toTicketDto),
      meta: {
        categories: TICKET_CATEGORIES,
        urgencyLevels: TICKET_URGENCY,
        statuses: TICKET_STATUSES,
      },
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const { filter, error } = parseTicketFilters(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const tickets = await populateTicketQuery(Ticket.find(filter)).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      data: tickets.map(toTicketDto),
      meta: {
        categories: TICKET_CATEGORIES,
        urgencyLevels: TICKET_URGENCY,
        statuses: TICKET_STATUSES,
      },
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const getTicketById = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;

    const ticket = await Ticket.findById(req.params.id)
      .populate("room", TICKET_POPULATE_SELECT.room)
      .populate("createdBy", TICKET_POPULATE_SELECT.userWithRole)
      .populate("assignedTo", TICKET_POPULATE_SELECT.userWithRole)
      .populate("statusLog.changedBy", TICKET_POPULATE_SELECT.userWithRole);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy?._id) === String(req.user.id);
    const isStaff = STAFF_ROLES.includes(normalizeRole(req.user.role));
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ ticket: toTicketDto(ticket) });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;
    if (!STAFF_ROLES.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const status = sanitizeText(req.body?.status);
    const note = sanitizeText(req.body?.note);

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid ticket status" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status === status) {
      return res.status(400).json({ message: "Ticket already has this status" });
    }
    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid transition from "${ticket.status}" to "${status}"`,
      });
    }

    const defaultNotes = {
      "In Progress": "Ticket is being worked on",
      Resolved: "Ticket has been resolved",
      Closed: "Ticket has been closed",
    };

    const previousStatus = ticket.status;
    ticket.status = status;
    ticket.assignedTo = req.user.id;
    ticket.statusLog.push({
      status,
      changedBy: req.user.id,
      note: note || defaultNotes[status] || `Status changed to ${status}`,
    });
    await ticket.save();

    const updated = await populateTicketQuery(Ticket.findById(ticket._id));
    await notifyStudentTicketStatusUpdated(updated, req.user.id, previousStatus);

    return res.status(200).json({
      message: "Ticket status updated",
      ticket: toTicketDto(updated),
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const assignTicket = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;
    if (!STAFF_ROLES.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignedTo = sanitizeText(req.body?.assignedTo);
    const note = sanitizeText(req.body?.note);
    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo is required" });
    }

    const assignee = await User.findById(assignedTo).select("role name email");
    if (!assignee || !STAFF_ROLES.includes(assignee.role)) {
      return res.status(400).json({ message: "Assigned user must be a warden or admin" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const previousStatus = ticket.status;
    ticket.assignedTo = assignee._id;
    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }
    ticket.statusLog.push({
      status: ticket.status,
      changedBy: req.user.id,
      note: note || `Ticket assigned to ${assignee.name}`,
    });
    await ticket.save();

    const updated = await populateTicketQuery(Ticket.findById(ticket._id));
    if (previousStatus !== updated.status) {
      await notifyStudentTicketStatusUpdated(updated, req.user.id, previousStatus);
    }
    return res.status(200).json({
      message: "Ticket assignment updated",
      ticket: toTicketDto(updated),
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const getTicketImageUrls = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;

    const ticket = await Ticket.findById(req.params.id).select(
      "images imageUrl imageName createdBy",
    );
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy) === String(req.user.id);
    const isStaff = STAFF_ROLES.includes(normalizeRole(req.user.role));
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Access denied" });
    }

    const rawImages =
      Array.isArray(ticket.images) && ticket.images.length
        ? ticket.images
        : ticket.imageUrl
          ? [{ url: ticket.imageUrl, name: ticket.imageName || "Attachment" }]
          : [];

    const signed = await Promise.all(
      rawImages.map(async (img) => {
        const key = extractKeyFromUrl(img.url);
        if (!key) return { url: img.url, name: img.name };
        try {
          const url = await getPresignedUrl(key);
          return { url, name: img.name };
        } catch {
          return { url: img.url, name: img.name };
        }
      }),
    );

    return res.status(200).json({ images: signed });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const addTicketNote = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;

    const note = sanitizeText(req.body?.note);
    if (!note || note.length < 3) {
      return res.status(400).json({ message: "Note must be at least 3 characters long" });
    }

    const ticket = await Ticket.findById(req.params.id).populate(
      "createdBy",
      TICKET_POPULATE_SELECT.userWithRole,
    );
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy?._id) === String(req.user.id);
    const isStaff = STAFF_ROLES.includes(normalizeRole(req.user.role));
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Access denied" });
    }

    ticket.statusLog.push({
      status: ticket.status,
      changedBy: req.user.id,
      note,
    });
    await ticket.save();

    const updated = await populateTicketQuery(Ticket.findById(ticket._id));
    const actorIsOwner = String(req.user.id) === String(updated.createdBy?._id ?? updated.createdBy);
    if (!actorIsOwner) {
      await notifyStudentTicketNote(updated, req.user.id, note);
    }
    return res.status(200).json({
      message: "Ticket note added",
      ticket: toTicketDto(updated),
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};
