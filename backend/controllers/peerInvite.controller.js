import Notification from "../models/Notification.js";
import PeerInvite from "../models/PeerInvite.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

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

export const createPeerInvite = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Not authorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const { roomId, peers } = req.body ?? {};
    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const contacts = normalizeContacts(peers);
    const expected = Math.max(Number(room.capacity) - 1, 0);
    if (expected > 0 && contacts.length !== expected) {
      return res.status(400).json({
        message: `Exactly ${expected} peer contact(s) are required for this room`,
      });
    }
    if (expected === 0 && contacts.length > 0) {
      return res
        .status(400)
        .json({ message: "Peers are not allowed for this room type" });
    }

    const invitees = [];
    for (const contact of contacts) {
      const peer = await User.findOne({
        role: "student",
        isApproved: true,
        $or: [{ email: contact }, { studentId: contact }],
      });
      if (!peer) {
        return res.status(400).json({
          message: `Peer "${contact}" was not found as an approved student`,
        });
      }
      if (String(peer._id) === String(req.user._id)) {
        return res.status(400).json({ message: "You cannot invite yourself as a peer" });
      }
      invitees.push({
        user: peer._id,
        contact,
        status: "pending",
      });
    }

    const duplicateUserIds = new Set(invitees.map((i) => String(i.user)));
    if (duplicateUserIds.size !== invitees.length) {
      return res.status(400).json({ message: "Duplicate peer users are not allowed" });
    }

    const peerInvite = await PeerInvite.create({
      room: room._id,
      inviter: req.user._id,
      invitees,
      status: invitees.length ? "pending" : "ready",
    });

    if (invitees.length) {
      const notifDocs = invitees.map((inv) => ({
        recipient: inv.user,
        actor: req.user._id,
        type: "peer_booking_invite",
        title: "Peer invite received",
        message: `You were invited to join Room ${room.roomNumber}.`,
        read: false,
        meta: {
          roomId: room._id,
          roomNumber: room.roomNumber,
          preBooking: true,
          peerInviteId: peerInvite._id,
        },
      }));
      await Notification.insertMany(notifDocs);
    }

    return res.status(201).json({
      id: peerInvite._id,
      roomId: room._id,
      status: peerInvite.status,
      invitees: peerInvite.invitees,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const respondToPeerInvite = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Not authorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const { action } = req.body ?? {};
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be accept or reject" });
    }

    const invite = await PeerInvite.findById(req.params.id);
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (!["pending", "ready"].includes(invite.status)) {
      return res.status(400).json({ message: "Invite is closed" });
    }

    const idx = invite.invitees.findIndex(
      (entry) => String(entry.user) === String(req.user.id),
    );
    if (idx < 0) {
      return res.status(403).json({ message: "You are not in this invite" });
    }

    if (invite.invitees[idx].status !== "pending") {
      return res.status(400).json({ message: "You already responded" });
    }

    invite.invitees[idx].status = action === "accept" ? "accepted" : "rejected";
    invite.invitees[idx].respondedAt = new Date();

    if (action === "reject") {
      invite.status = "rejected";
    } else if (invite.invitees.every((entry) => entry.status === "accepted")) {
      invite.status = "ready";
    } else {
      invite.status = "pending";
    }

    await invite.save();

    await Notification.updateMany(
      {
        "meta.peerInviteId": invite._id,
        recipient: req.user._id,
      },
      { $set: { read: true } },
    );

    return res.status(200).json({
      id: invite._id,
      status: invite.status,
      invitees: invite.invitees,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyPeerInvites = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Not authorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const roomId = req.query.roomId;
    const filter = {
      $or: [{ inviter: req.user._id }, { "invitees.user": req.user._id }],
    };
    if (roomId) filter.room = roomId;

    const invites = await PeerInvite.find(filter)
      .sort({ createdAt: -1 })
      .populate("room")
      .populate("inviter", "name email studentId")
      .populate("invitees.user", "name email studentId");

    return res.status(200).json({ data: invites });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
