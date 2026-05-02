import Booking from "../models/Booking.js";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Ticket, {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_URGENCY,
  TICKET_MAX_ASSIGNEES,
} from "../models/Ticket.js";
import User from "../models/User.js";
import { uploadBufferToR2, extractKeyFromUrl, getPresignedUrl } from "../utils/r2Upload.js";
import {
  sendTicketAssignedEmailToStaff,
  sendTicketCreatedEmailToStudent,
  sendTicketCreatedEmailToWarden,
  sendTicketResolvedEmailToStudent,
  sendTicketUnassignedEmailToStaff,
} from "../utils/brevoEmail.js";

const STAFF_ROLES = ["admin", "warden"];
const MANAGER_ROLES = ["admin", "warden"];
const STAFF_WORKER_ROLE = "staff";
const ASSIGNEE_ROLES = ["staff"];
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

function isManagerRole(role) {
  return MANAGER_ROLES.includes(normalizeRole(role));
}

function isStaffWorkerRole(role) {
  return normalizeRole(role) === STAFF_WORKER_ROLE;
}

function assigneeIdStrings(ticket) {
  const list = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
  return list.map((a) => String(a._id ?? a ?? ""));
}

function isTicketAssignedToUser(ticket, userId, userEmail) {
  if (!userId) return false;
  const normEmail = userEmail ? String(userEmail).trim().toLowerCase() : "";
  const list = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
  for (const entry of list) {
    const id = entry?._id ?? entry?.id ?? entry;
    if (id && String(id) === String(userId)) return true;
    if (normEmail && entry?.email) {
      const em = String(entry.email).trim().toLowerCase();
      if (em && em === normEmail) return true;
    }
  }
  return false;
}

function ticketHasAssignees(ticket) {
  const list = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
  return list.length > 0;
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

/** Student may edit content only while ticket is not terminal and has no assignee. */
function canStudentEditTicketForUpdate(ticket) {
  if (!ticket) return false;
  if (["Resolved", "Closed"].includes(ticket.status)) return false;
  return !ticketHasAssignees(ticket);
}

function populateTicketQuery(query) {
  return query
    .populate("room", TICKET_POPULATE_SELECT.room)
    .populate("createdBy", TICKET_POPULATE_SELECT.user)
    .populate("assignees", TICKET_POPULATE_SELECT.user)
    .populate("statusLog.changedBy", TICKET_POPULATE_SELECT.user);
}

function mapAssigneesToDto(assignees) {
  const list = Array.isArray(assignees) ? assignees : [];
  return list
    .map((u) => {
      if (!u) return null;
      const id = u._id ?? u.id ?? u;
      if (!id) return null;
      return {
        id,
        name: u.name ?? "",
        email: u.email ?? "",
      };
    })
    .filter(Boolean);
}

function toTicketDto(ticket) {
  const images = Array.isArray(ticket.images) ? ticket.images : [];
  const assigneeDtos = mapAssigneesToDto(ticket.assignees);
  const assignedToCompat = assigneeDtos[0] ?? null;
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
    assignees: assigneeDtos,
    assignedTo: assignedToCompat,
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

async function getTicketWithAllEmailFields(ticketId) {
  return Ticket.findById(ticketId)
    .populate("room", "roomNumber")
    .populate("createdBy", "name email role")
    .populate("assignees", "name email role")
    .populate("statusLog.changedBy", "name email role");
}

async function getAllActiveWardens() {
  return User.find({ role: "warden", isApproved: true }).select("name email");
}

async function safeSendEmail(label, task) {
  try {
    await task();
  } catch (error) {
    console.error(`[ticket-email:${label}] send failed:`, error);
  }
}

async function sendTicketCreatedEmails(ticket) {
  const student = ticket?.createdBy;
  if (student?.email) {
    await safeSendEmail("student-created", () =>
      sendTicketCreatedEmailToStudent({
        toEmail: student.email,
        studentName: student.name,
        ticket,
        room: ticket?.room,
      }),
    );
  }

  const wardens = await getAllActiveWardens();
  for (const warden of wardens) {
    if (!warden?.email) continue;
    await safeSendEmail(`warden-created-${warden._id}`, () =>
      sendTicketCreatedEmailToWarden({
        toEmail: warden.email,
        wardenName: warden.name,
        ticket,
        studentName: student?.name || "Student",
        room: ticket?.room,
      }),
    );
  }
}

async function sendTicketAssignedEmailsForNewIds(ticketId, newAssigneeIds, assignedByName) {
  if (!Array.isArray(newAssigneeIds) || newAssigneeIds.length === 0) return;
  const ticket = await getTicketWithAllEmailFields(ticketId);
  if (!ticket) return;
  const list = Array.isArray(ticket.assignees) ? ticket.assignees : [];
  const idSet = new Set(newAssigneeIds.map((id) => String(id)));
  for (const assignee of list) {
    const aid = assignee?._id ?? assignee?.id;
    if (!aid || !idSet.has(String(aid))) continue;
    if (!assignee?.email) continue;
    await safeSendEmail(`staff-assigned-${aid}`, () =>
      sendTicketAssignedEmailToStaff({
        toEmail: assignee.email,
        staffName: assignee.name,
        ticket,
        assignedByName,
      }),
    );
  }
}

async function sendTicketUnassignedEmailsForRemovedIds(
  ticketId,
  removedAssigneeIds,
  removedByName,
) {
  if (!Array.isArray(removedAssigneeIds) || removedAssigneeIds.length === 0) return;
  const ticket = await getTicketWithAllEmailFields(ticketId);
  if (!ticket) return;
  for (const rid of removedAssigneeIds) {
    const idStr = String(rid);
    const user = await User.findById(rid).select("name email");
    if (!user?.email) continue;
    await safeSendEmail(`staff-unassigned-${idStr}-${ticketId}`, () =>
      sendTicketUnassignedEmailToStaff({
        toEmail: user.email,
        staffName: user.name,
        ticket,
        removedByName,
      }),
    );
  }
}

async function sendTicketResolvedEmail(ticket, resolvedByName) {
  const student = ticket?.createdBy;
  if (!student?.email) return;
  await safeSendEmail(`student-resolved-${student._id}`, () =>
    sendTicketResolvedEmailToStudent({
      toEmail: student.email,
      studentName: student.name,
      ticket,
      resolvedByName,
    }),
  );
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
    await sendTicketCreatedEmails(saved);

    return res.status(201).json({ ticket: toTicketDto(saved) });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

export const updateTicketByStudent = async (req, res) => {
  try {
    if (!requireStudent(req, res)) return;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ownerId = ticket.createdBy?._id ?? ticket.createdBy;
    if (String(ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own tickets" });
    }

    if (!canStudentEditTicketForUpdate(ticket)) {
      return res.status(403).json({
        message:
          "Ticket can no longer be edited because it is resolved, closed, or assigned to staff.",
      });
    }

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

    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
    let uploadedImages = null;
    if (files.length > 0) {
      uploadedImages = [];
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
    }

    ticket.category = category;
    ticket.subject = subject;
    ticket.description = description;
    ticket.urgency = urgency;

    if (uploadedImages && uploadedImages.length > 0) {
      ticket.images = uploadedImages;
      ticket.imageUrl = uploadedImages[0]?.url ?? "";
      ticket.imageName = uploadedImages[0]?.name ?? "";
    }

    await ticket.save();

    const saved = await populateTicketQuery(Ticket.findById(ticket._id));
    return res.status(200).json({ ticket: toTicketDto(saved) });
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

export const getAssignedTicketsForStaff = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;
    if (normalizeRole(req.user.role) !== "staff") {
      return res.status(403).json({ message: "Staff access only" });
    }

    const { filter, error } = parseTicketFilters(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const tickets = await populateTicketQuery(
      Ticket.find({ ...filter, assignees: req.user.id }),
    ).sort({
      updatedAt: -1,
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
      .populate("assignees", TICKET_POPULATE_SELECT.userWithRole)
      .populate("statusLog.changedBy", TICKET_POPULATE_SELECT.userWithRole);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy?._id) === String(req.user.id);
    const isManager = isManagerRole(req.user.role);
    const isAssignee = isTicketAssignedToUser(ticket, req.user.id, req.user.email);
    if (!isOwner && !isManager && !isAssignee) {
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

    const status = sanitizeText(req.body?.status);
    const note = sanitizeText(req.body?.note);

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid ticket status" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const isManager = isManagerRole(req.user.role);
    const isAssignee = isTicketAssignedToUser(ticket, req.user.id);
    const isStaffWorker = isStaffWorkerRole(req.user.role);
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (isManager && ticketHasAssignees(ticket) && status !== "Resolved") {
      return res.status(403).json({
        message: "Assigned staff controls this ticket. Managers can only mark it as Resolved.",
      });
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
    if (isAssignee && !isManager) {
      const sid = req.user.id;
      const raw = ticket.assignees || [];
      const hasMe = raw.some((id) => String(id) === String(sid));
      if (!hasMe) {
        if (raw.length >= TICKET_MAX_ASSIGNEES) {
          return res.status(400).json({
            message: `At most ${TICKET_MAX_ASSIGNEES} assignees per ticket`,
          });
        }
        ticket.assignees = [...raw, sid];
      }
    }
    ticket.statusLog.push({
      status,
      changedBy: req.user.id,
      note: note || defaultNotes[status] || `Status changed to ${status}`,
    });
    await ticket.save();

    const updated = await populateTicketQuery(Ticket.findById(ticket._id));
    await notifyStudentTicketStatusUpdated(updated, req.user.id, previousStatus);
    if (updated.status === "Resolved") {
      const actor = await User.findById(req.user.id).select("name");
      await sendTicketResolvedEmail(updated, actor?.name || "Support team");
    }

    return res.status(200).json({
      message: "Ticket status updated",
      ticket: toTicketDto(updated),
    });
  } catch (error) {
    return respondControllerError(error, res);
  }
};

function requestsAssignmentMutation(body) {
  if (body.assigneeIds !== undefined) return true;
  if (body.clearAssignees === true) return true;
  if (sanitizeText(body.removeAssignee)) return true;
  const add = sanitizeText(body.addAssignee ?? body.assignedTo);
  if (add) return true;
  if (body.assignedTo !== undefined && sanitizeText(body.assignedTo) === "") return true;
  return false;
}

async function validateStaffObjectIds(rawIds) {
  const unique = [...new Set((rawIds || []).map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length > TICKET_MAX_ASSIGNEES) {
    return { error: `At most ${TICKET_MAX_ASSIGNEES} assignees allowed` };
  }
  const objectIds = [];
  for (const id of unique) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { error: "Invalid staff id" };
    }
    objectIds.push(new mongoose.Types.ObjectId(id));
  }
  const users = await User.find({ _id: { $in: objectIds } }).select("role name email");
  if (users.length !== unique.length) {
    return { error: "One or more staff users not found" };
  }
  for (const u of users) {
    if (!ASSIGNEE_ROLES.includes(normalizeRole(u.role))) {
      return { error: "Assigned users must be staff members" };
    }
  }
  return { objectIds };
}

export const assignTicket = async (req, res) => {
  try {
    if (!requireAuthenticatedUser(req, res)) return;
    if (!STAFF_ROLES.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const note = sanitizeText(req.body?.note);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (["Resolved", "Closed"].includes(ticket.status) && requestsAssignmentMutation(req.body)) {
      return res.status(403).json({
        message: "Assignment cannot be changed while the ticket is resolved or closed.",
      });
    }

    const previousStatus = ticket.status;
    const prevSet = new Set(assigneeIdStrings(ticket));
    let newAssigneeIdsForEmail = [];
    let logNote = "";

    if (req.body.assigneeIds !== undefined) {
      if (!Array.isArray(req.body.assigneeIds)) {
        return res.status(400).json({ message: "assigneeIds must be an array" });
      }
      const { error, objectIds } = await validateStaffObjectIds(req.body.assigneeIds);
      if (error) return res.status(400).json({ message: error });
      newAssigneeIdsForEmail = objectIds.filter((id) => !prevSet.has(String(id)));
      ticket.assignees = objectIds;
      logNote =
        note ||
        (objectIds.length === 0
          ? "Assignees cleared"
          : `Assignees set (${objectIds.length} staff)`);
    } else if (req.body.clearAssignees === true) {
      ticket.assignees = [];
      logNote = note || "All assignees cleared";
    } else if (sanitizeText(req.body.removeAssignee)) {
      const rid = sanitizeText(req.body.removeAssignee);
      ticket.assignees = (ticket.assignees || []).filter((id) => String(id) !== rid);
      logNote = note || "Assignee removed";
    } else if (sanitizeText(req.body.addAssignee) || sanitizeText(req.body.assignedTo)) {
      const addId = sanitizeText(req.body.addAssignee) || sanitizeText(req.body.assignedTo);
      const assignee = await User.findById(addId).select("role name email");
      if (!assignee || !ASSIGNEE_ROLES.includes(normalizeRole(assignee.role))) {
        return res.status(400).json({ message: "Assigned user must be a staff member" });
      }
      const ids = (ticket.assignees || []).map((x) => String(x));
      if (!ids.includes(String(assignee._id))) {
        if (ids.length >= TICKET_MAX_ASSIGNEES) {
          return res.status(400).json({
            message: `At most ${TICKET_MAX_ASSIGNEES} assignees allowed`,
          });
        }
        ticket.assignees = [...(ticket.assignees || []), assignee._id];
        newAssigneeIdsForEmail.push(assignee._id);
      }
      logNote = note || `Added assignee ${assignee.name}`;
    } else if (req.body.assignedTo !== undefined && sanitizeText(req.body.assignedTo) === "") {
      ticket.assignees = [];
      logNote = note || "All assignees cleared";
    } else {
      return res.status(400).json({
        message:
          "Specify assigneeIds, clearAssignees, removeAssignee, addAssignee, or assignedTo (empty string clears)",
      });
    }

    const beforeCount = prevSet.size;
    const afterCount = (ticket.assignees || []).length;
    if (beforeCount === 0 && afterCount > 0 && ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    ticket.statusLog.push({
      status: ticket.status,
      changedBy: req.user.id,
      note: logNote,
    });

    await ticket.save();

    const updated = await populateTicketQuery(Ticket.findById(ticket._id));
    const actor = await User.findById(req.user.id).select("name");
    const afterAssigneeSet = new Set(assigneeIdStrings(updated));
    const removedAssigneeIdsForEmail = [...prevSet].filter(
      (id) => id && !afterAssigneeSet.has(id),
    );
    await sendTicketAssignedEmailsForNewIds(
      updated._id,
      newAssigneeIdsForEmail,
      actor?.name || "Manager",
    );
    await sendTicketUnassignedEmailsForRemovedIds(
      updated._id,
      removedAssigneeIdsForEmail,
      actor?.name || "Manager",
    );
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
      "images imageUrl imageName createdBy assignees",
    );
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy) === String(req.user.id);
    const isManager = isManagerRole(req.user.role);
    const isAssignee = isTicketAssignedToUser(ticket, req.user.id, req.user.email);
    if (!isOwner && !isManager && !isAssignee) {
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

    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", TICKET_POPULATE_SELECT.userWithRole)
      .populate("assignees", TICKET_POPULATE_SELECT.userWithRole);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isOwner = String(ticket.createdBy?._id) === String(req.user.id);
    const isManager = isManagerRole(req.user.role);
    const isAssignee = isTicketAssignedToUser(ticket, req.user.id, req.user.email);
    if (!isOwner && !isManager && !isAssignee) {
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
