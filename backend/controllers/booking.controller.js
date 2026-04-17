import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import PeerInvite from "../models/PeerInvite.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

const ROOM_TYPES_WITH_PEERS = new Set(["double", "triple"]);

function normalizeRoomType(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseDateOrNull(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function recalculateAvailability({ currentOccupancy, capacity, status }) {
  if (status === "Maintenance") return "Maintenance";
  return currentOccupancy >= capacity ? "Full" : "Available";
}

function normalizePeerContacts(input) {
  if (!Array.isArray(input)) return [];
  const dedupe = new Set();
  const contacts = [];
  for (const item of input) {
    const contact = String(item ?? "").trim().toLowerCase();
    if (!contact) continue;
    if (dedupe.has(contact)) continue;
    dedupe.add(contact);
    contacts.push(contact);
  }
  return contacts;
}

async function resolvePeersFromContacts(contacts, bookerUser) {
  const peers = [];
  for (const contact of contacts) {
    const peerUser = await User.findOne({
      role: "student",
      isApproved: true,
      $or: [{ email: contact }, { studentId: contact }],
    });
    if (!peerUser) {
      return {
        error: `Peer "${contact}" was not found as an approved student`,
      };
    }
    if (String(peerUser._id) === String(bookerUser._id)) {
      return { error: "You cannot invite yourself as a peer" };
    }
    peers.push({
      user: peerUser,
      contact,
    });
  }
  const idSet = new Set(peers.map((p) => String(p.user._id)));
  if (idSet.size !== peers.length) {
    return { error: "Duplicate peer users are not allowed" };
  }
  return { peers };
}

async function createPeerInviteNotifications({
  actorId,
  bookingId,
  room,
  checkIn,
  checkOut,
  peerUsers,
}) {
  if (!peerUsers.length) return;
  const docs = peerUsers.map((peer) => ({
    recipient: peer._id,
    actor: actorId,
    type: "peer_booking_invite",
    title: "Room booking invitation",
    message: `You were invited to join Room ${room.roomNumber} from ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()}.`,
    booking: bookingId,
    read: false,
    meta: {
      roomId: room._id,
      roomNumber: room.roomNumber,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
    },
  }));
  await Notification.insertMany(docs);
}

async function notifyBooker({
  recipientId,
  actorId,
  booking,
  type,
  title,
  message,
}) {
  await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    title,
    message,
    booking: booking._id,
    read: false,
    meta: {
      roomId: booking.room?._id ?? booking.room,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    },
  });
}

async function finalizeBookingAndRoom(booking, room, actorId) {
  const occupantsToAdd = 1 + booking.peers.length;
  const nextOccupancy = Number(room.currentOccupancy) + occupantsToAdd;
  if (nextOccupancy > Number(room.capacity)) {
    throw new Error("Room no longer has enough capacity to confirm booking");
  }

  booking.bookingStatus = "confirmed";
  await booking.save();

  room.currentOccupancy = nextOccupancy;
  room.availabilityStatus = recalculateAvailability({
    currentOccupancy: room.currentOccupancy,
    capacity: room.capacity,
    status: room.availabilityStatus,
  });
  await room.save();

  await notifyBooker({
    recipientId: booking.student,
    actorId,
    booking,
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: "All peers accepted. Your booking is now confirmed.",
  });
}

export const createBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const {
      roomId,
      checkInDate,
      checkOutDate,
      stayDays,
      roomFees,
      securityDeposit,
      totalDue,
      paymentMethod,
      paymentSplitMode,
      amountPaidNow,
      peers,
      peerInviteId,
      receipt,
      cardMasked,
    } = req.body ?? {};

    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const checkIn = parseDateOrNull(checkInDate);
    const checkOut = parseDateOrNull(checkOutDate);
    if (!checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "checkInDate and checkOutDate must be valid dates" });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ message: "Check-out must be after check-in" });
    }

    const parsedStayDays = Number(stayDays);
    const parsedRoomFees = Number(roomFees);
    const parsedDeposit = Number(securityDeposit);
    const parsedTotal = Number(totalDue);
    if (!Number.isFinite(parsedStayDays) || parsedStayDays < 1) {
      return res.status(400).json({ message: "stayDays must be at least 1" });
    }
    if (
      !Number.isFinite(parsedRoomFees) ||
      parsedRoomFees < 0 ||
      !Number.isFinite(parsedDeposit) ||
      parsedDeposit < 0 ||
      !Number.isFinite(parsedTotal) ||
      parsedTotal < 0
    ) {
      return res.status(400).json({ message: "Invalid payment amount values" });
    }

    if (!["card", "bank"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: "paymentMethod must be card or bank" });
    }
    const splitMode = paymentSplitMode === "split" ? "split" : "single";

    const normalizedRoomType = normalizeRoomType(room.roomType);
    const expectedPeers = ROOM_TYPES_WITH_PEERS.has(normalizedRoomType)
      ? Math.max(Number(room.capacity) - 1, 0)
      : 0;
    const peerContacts = normalizePeerContacts(peers);

    if (expectedPeers > 0 && peerContacts.length !== expectedPeers) {
      return res.status(400).json({
        message: `Exactly ${expectedPeers} peer contact(s) are required for this room`,
      });
    }
    if (expectedPeers === 0 && peerContacts.length > 0) {
      return res
        .status(400)
        .json({ message: "Peers are not allowed for this room type" });
    }

    let resolvedPeers = { peers: [] };
    let peerInvite = null;
    let inviteByContact = new Map();
    if (expectedPeers > 0) {
      if (peerInviteId) {
        peerInvite = await PeerInvite.findById(peerInviteId);
        if (!peerInvite) {
          return res.status(400).json({ message: "Peer invite session was not found" });
        }
        if (String(peerInvite.inviter) !== String(req.user.id)) {
          return res
            .status(403)
            .json({ message: "This peer invite session belongs to another user" });
        }
        if (String(peerInvite.room) !== String(room._id)) {
          return res
            .status(400)
            .json({ message: "Peer invite room does not match current room" });
        }
        if (peerInvite.status === "rejected") {
          return res.status(400).json({
            message: "A peer declined the invitation. Booking is cancelled.",
          });
        }

        const inviteContacts = peerInvite.invitees.map((inv) => String(inv.contact));
        if (inviteContacts.length !== expectedPeers) {
          return res.status(400).json({ message: "Invalid peer invite size for this room" });
        }
        inviteByContact = new Map(
          peerInvite.invitees.map((inv) => [String(inv.contact), inv]),
        );

        resolvedPeers = await resolvePeersFromContacts(inviteContacts, req.user);
      } else {
        resolvedPeers = await resolvePeersFromContacts(peerContacts, req.user);
      }
      if (resolvedPeers.error) {
        return res.status(400).json({ message: resolvedPeers.error });
      }
    }

    const safeReceipt =
      paymentMethod === "bank" && receipt
        ? {
            uri: String(receipt.uri ?? "").trim(),
            name: String(receipt.name ?? "").trim(),
            mimeType: String(receipt.mimeType ?? "").trim(),
            size:
              receipt.size === undefined || receipt.size === null
                ? undefined
                : Number(receipt.size),
          }
        : undefined;
    if (paymentMethod === "bank" && !safeReceipt?.uri) {
      return res
        .status(400)
        .json({ message: "Receipt is required for bank deposits" });
    }
    const paidNow =
      splitMode === "split" ? Number(amountPaidNow) : parsedTotal;
    const expectedHalf = Math.round(parsedTotal / 2);
    if (!Number.isFinite(paidNow) || paidNow < 0 || paidNow > parsedTotal) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }
    if (splitMode === "split") {
      if (expectedPeers < 1) {
        return res.status(400).json({
          message: "Split payment is only available when booking with peers",
        });
      }
      if (paidNow !== expectedHalf) {
        return res.status(400).json({
          message: `For split payment, you must pay exactly Rs. ${expectedHalf}`,
        });
      }
    }

    const booking = await Booking.create({
      student: req.user.id,
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      stayDays: parsedStayDays,
      roomFees: parsedRoomFees,
      securityDeposit: parsedDeposit,
      totalDue: parsedTotal,
      paymentSplitMode: splitMode,
      amountPaidByBooker: paidNow,
      amountPendingFromPeers: parsedTotal - paidNow,
      paymentMethod,
      paymentStatus: splitMode === "split" ? "submitted" : "completed",
      bookingStatus: "pending",
      peers: (resolvedPeers.peers ?? []).map((p) => ({
        contact: p.contact,
        user: p.user._id,
        status:
          inviteByContact.get(p.contact)?.status === "accepted" ? "accepted" : "pending",
        respondedAt:
          inviteByContact.get(p.contact)?.status === "accepted"
            ? inviteByContact.get(p.contact)?.respondedAt ?? new Date()
            : undefined,
      })),
      receipt: safeReceipt,
      cardMasked:
        paymentMethod === "card" ? String(cardMasked ?? "").trim() : undefined,
    });

    const pendingPeerUsers = (resolvedPeers.peers ?? [])
      .filter((p) => inviteByContact.get(p.contact)?.status !== "accepted")
      .map((p) => p.user);
    if (pendingPeerUsers.length > 0) {
      await createPeerInviteNotifications({
        actorId: req.user.id,
        bookingId: booking._id,
        room,
        checkIn,
        checkOut,
        peerUsers: pendingPeerUsers,
      });
      await booking.save();
    } else {
      await finalizeBookingAndRoom(booking, room, req.user.id);
      if (peerInvite) {
        peerInvite.status = "expired";
        await peerInvite.save();
      }
    }

    return res.status(201).json({
      bookingId: booking._id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const respondToPeerInvite = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const { action } = req.body ?? {};
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be accept or reject" });
    }

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.bookingStatus !== "pending") {
      return res.status(400).json({ message: "Booking is no longer pending" });
    }

    const peerIndex = booking.peers.findIndex(
      (p) => String(p.user) === String(req.user.id),
    );
    if (peerIndex < 0) {
      return res
        .status(403)
        .json({ message: "You are not invited for this booking" });
    }

    if (booking.peers[peerIndex].status !== "pending") {
      return res.status(400).json({ message: "You already responded" });
    }

    booking.peers[peerIndex].status = action === "accept" ? "accepted" : "rejected";
    booking.peers[peerIndex].respondedAt = new Date();

    if (action === "reject") {
      booking.bookingStatus = "rejected";
      await booking.save();
      await notifyBooker({
        recipientId: booking.student,
        actorId: req.user.id,
        booking,
        type: "peer_invite_rejected",
        title: "Peer invitation rejected",
        message: "A peer rejected your booking invitation.",
      });
      return res.status(200).json({
        bookingId: booking._id,
        bookingStatus: booking.bookingStatus,
      });
    }

    const allAccepted = booking.peers.every((p) => p.status === "accepted");
    if (allAccepted) {
      await finalizeBookingAndRoom(booking, booking.room, req.user.id);
    } else {
      await booking.save();
      await notifyBooker({
        recipientId: booking.student,
        actorId: req.user.id,
        booking,
        type: "peer_invite_accepted",
        title: "Peer accepted invitation",
        message: "One peer accepted. Waiting for remaining peer approvals.",
      });
    }

    return res.status(200).json({
      bookingId: booking._id,
      bookingStatus: booking.bookingStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

function toBookingDto(booking, viewerUserId) {
  const ownPeer = booking.peers.find(
    (p) => String(p.user?._id ?? p.user) === String(viewerUserId),
  );
  return {
    id: booking._id,
    room: booking.room,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    stayDays: booking.stayDays,
    roomFees: booking.roomFees,
    securityDeposit: booking.securityDeposit,
    totalDue: booking.totalDue,
    paymentSplitMode: booking.paymentSplitMode,
    amountPaidByBooker: booking.amountPaidByBooker,
    amountPendingFromPeers: booking.amountPendingFromPeers,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    peers: booking.peers,
    createdAt: booking.createdAt,
    viewerRole:
      String(booking.student?._id ?? booking.student) === String(viewerUserId)
        ? "booker"
        : ownPeer
          ? "peer"
          : "other",
    ownPeerStatus: ownPeer?.status ?? null,
  };
}

export const getMyLatestBooking = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }

    const booking = await Booking.findOne({
      $or: [{ student: req.user.id }, { "peers.user": req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("room")
      .populate("student", "name email studentId")
      .populate("peers.user", "name email studentId");

    if (!booking) {
      return res.status(200).json({ booking: null });
    }

    return res.status(200).json({
      booking: toBookingDto(booking, req.user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access only" });
    }
    const bookings = await Booking.find({
      $or: [{ student: req.user.id }, { "peers.user": req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("room")
      .populate("student", "name email studentId")
      .populate("peers.user", "name email studentId");

    return res.status(200).json({
      data: bookings.map((b) => toBookingDto(b, req.user.id)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
