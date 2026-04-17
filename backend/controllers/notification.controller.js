import Notification from "../models/Notification.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

export const getMyNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate("actor", "name email studentId")
      .limit(100);
    return res.status(200).json({ data: notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } },
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

function normalizeContacts(contacts) {
  if (!Array.isArray(contacts)) return [];
  const seen = new Set();
  const out = [];
  for (const value of contacts) {
    const contact = String(value ?? "").trim().toLowerCase();
    if (!contact) continue;
    if (seen.has(contact)) continue;
    seen.add(contact);
    out.push(contact);
  }
  return out;
}

export const sendPeerInviteNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const { roomId, peers } = req.body ?? {};
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const contacts = normalizeContacts(peers);
    if (!contacts.length) {
      return res.status(400).json({ message: "At least one peer contact is required" });
    }

    const expected = Math.max(Number(room.capacity) - 1, 0);
    if (expected > 0 && contacts.length !== expected) {
      return res.status(400).json({
        message: `Exactly ${expected} peer contact(s) are required for this room`,
      });
    }

    const docs = [];
    for (const contact of contacts) {
      const peerUser = await User.findOne({
        role: "student",
        isApproved: true,
        $or: [{ email: contact }, { studentId: contact }],
      });
      if (!peerUser) {
        return res.status(400).json({
          message: `Peer "${contact}" was not found as an approved student`,
        });
      }
      if (String(peerUser._id) === String(req.user._id)) {
        return res.status(400).json({ message: "You cannot invite yourself as a peer" });
      }
      docs.push({
        recipient: peerUser._id,
        actor: req.user._id,
        type: "peer_booking_invite",
        title: "Peer invite received",
        message: `You were invited to join Room ${room.roomNumber}.`,
        read: false,
        meta: {
          roomId: room._id,
          roomNumber: room.roomNumber,
          preBooking: true,
        },
      });
    }

    await Notification.insertMany(docs);
    return res.status(201).json({ message: "Peer invite notifications sent" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
