import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Room from "../models/Room.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import SignupOtpSession from "../models/SignupOtpSession.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadBufferToR2 } from "../utils/r2Upload.js";
import {
  sendPasswordResetOtpEmail,
  sendSignupOtpEmail,
  sendOperationalAccountInvitationEmail,
  sendOperationalAccountActivatedEmail,
} from "../utils/brevoEmail.js";
import { parseNic } from "../utils/nicValidation.js";
import {
  normalizeSignupEmail,
  validateSignupEmailFormat,
  validateSignupName,
  validateSignupPassword,
  validateSignupPhoneFull,
  validateSignupStudentId,
} from "../utils/signupValidation.js";

const GENDERS = ["male", "female"];

const PASSWORD_RESET_OTP_TTL_MS = 15 * 60 * 1000;
const SIGNUP_OTP_TTL_MS = 10 * 60 * 1000;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;
const MIN_NEW_PASSWORD_LEN = 8;
const FIRST_LOGIN_PASSWORD_MIN_LEN = 8;

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive match for stored emails */
function emailQueryFilter(normalized) {
  return { email: new RegExp(`^${escapeRegex(normalized)}$`, "i") };
}

function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function toTrimmedString(value) {
  return String(value ?? "").trim();
}

async function validateSignupUniqueness({ email, studentId }) {
  const duplicateEmail = await User.findOne(emailQueryFilter(normalizeEmail(email)));
  if (duplicateEmail) {
    return "Email already registered";
  }
  if (studentId) {
    const duplicateStudentId = await User.findOne({ studentId: String(studentId) });
    if (duplicateStudentId) {
      return "Student ID already registered";
    }
  }
  return null;
}

function recalculateRoomAvailability({ currentOccupancy, capacity, status }) {
  if (status === "Maintenance") return "Maintenance";
  return currentOccupancy >= capacity ? "Full" : "Available";
}

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

async function writeAdminAuditLog({ action, actorId, targetAdminId, details }) {
  if (!actorId) return;
  await AdminAuditLog.create({
    action,
    actor: actorId,
    targetAdmin: targetAdminId,
    details,
  });
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Public: check email / studentId uniqueness during signup (no auth). */
export const checkRegisterAvailability = async (req, res) => {
  try {
    const emailParam = req.query?.email;
    const studentIdParam = req.query?.studentId;
    const out = {};

    if (emailParam !== undefined && String(emailParam).trim() !== "") {
      const fmt = validateSignupEmailFormat(emailParam);
      if (fmt.ok) {
        const email = normalizeSignupEmail(emailParam);
        const dup = await User.findOne(emailQueryFilter(email));
        out.emailTaken = Boolean(dup);
      }
    }

    if (studentIdParam !== undefined && String(studentIdParam).trim() !== "") {
      const studentId = toTrimmedString(studentIdParam);
      const dup = await User.findOne({ studentId: String(studentId) });
      out.studentIdTaken = Boolean(dup);
    }

    return res.status(200).json(out);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const requestRegisterOtp = async (req, res) => {
  try {
    const name = toTrimmedString(req.body?.name);
    const password = String(req.body?.password ?? "");
    const studentId = toTrimmedString(req.body?.studentId);
    const yearRaw = req.body?.year;
    const semesterRaw = req.body?.semester;
    const contactNo = toTrimmedString(req.body?.contactNo);
    const guardianName = toTrimmedString(req.body?.guardianName);
    const guardianContact = toTrimmedString(req.body?.guardianContact);
    const gender = toTrimmedString(req.body?.gender);

    const emailFmt = validateSignupEmailFormat(req.body?.email);
    if (!emailFmt.ok) {
      return res.status(400).json({ message: emailFmt.message });
    }
    const email = normalizeSignupEmail(req.body?.email);

    const nameErr = validateSignupName(name, "Full name");
    if (!nameErr.ok) return res.status(400).json({ message: nameErr.message });

    if (!password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }
    const pwdErr = validateSignupPassword(password);
    if (!pwdErr.ok) return res.status(400).json({ message: pwdErr.message });

    const sidErr = validateSignupStudentId(studentId);
    if (!sidErr.ok) return res.status(400).json({ message: sidErr.message });

    const contactErr = validateSignupPhoneFull(contactNo);
    if (!contactErr.ok) return res.status(400).json({ message: contactErr.message });

    const guardianNameErr = validateSignupName(guardianName, "Guardian name");
    if (!guardianNameErr.ok) {
      return res.status(400).json({ message: guardianNameErr.message });
    }

    const guardianContactErr = validateSignupPhoneFull(
      guardianContact,
      "Guardian contact",
    );
    if (!guardianContactErr.ok) {
      return res.status(400).json({ message: guardianContactErr.message });
    }

    if (!gender || !GENDERS.includes(gender)) {
      return res
        .status(400)
        .json({ message: "gender is required and must be male or female" });
    }

    const duplicateMsg = await validateSignupUniqueness({ email, studentId });
    if (duplicateMsg) return res.status(400).json({ message: duplicateMsg });

    let profileImageUrl = null;
    let idCardImageUrl = null;
    if (req.files?.profileImage?.[0]) {
      const profileFile = req.files.profileImage[0];
      profileImageUrl = await uploadBufferToR2(
        profileFile.buffer,
        profileFile.originalname,
        profileFile.mimetype,
      );
    }
    if (req.files?.idCardImage?.[0]) {
      const idCardFile = req.files.idCardImage[0];
      idCardImageUrl = await uploadBufferToR2(
        idCardFile.buffer,
        idCardFile.originalname,
        idCardFile.mimetype,
      );
    }

    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 10);

    const year = yearRaw === undefined || yearRaw === "" ? undefined : Number(yearRaw);
    const semester =
      semesterRaw === undefined || semesterRaw === ""
        ? undefined
        : Number(semesterRaw);

    await SignupOtpSession.findOneAndUpdate(
      { email },
      {
        email,
        otpHash,
        otpExpiresAt: new Date(Date.now() + SIGNUP_OTP_TTL_MS),
        otpAttempts: 0,
        payload: {
          name,
          email,
          passwordHash,
          studentId: studentId || undefined,
          year: Number.isFinite(year) ? year : undefined,
          semester: Number.isFinite(semester) ? semester : undefined,
          contactNo: contactNo || undefined,
          guardianName: guardianName || undefined,
          guardianContact: guardianContact || undefined,
          gender,
          profileImage: profileImageUrl || undefined,
          idCardImage: idCardImageUrl || undefined,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await sendSignupOtpEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent to your email. Verify to complete registration.",
      email,
      expiresInSeconds: Math.floor(SIGNUP_OTP_TTL_MS / 1000),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyRegisterOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = toTrimmedString(req.body?.otp);

    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const session = await SignupOtpSession.findOne({ email }).select(
      "+otpHash +payload.passwordHash",
    );
    if (!session?.otpHash || !session?.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP session" });
    }

    if (session.otpExpiresAt.getTime() < Date.now()) {
      await SignupOtpSession.deleteOne({ _id: session._id });
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    if (Number(session.otpAttempts || 0) >= SIGNUP_OTP_MAX_ATTEMPTS) {
      await SignupOtpSession.deleteOne({ _id: session._id });
      return res
        .status(400)
        .json({ message: "Maximum OTP attempts exceeded. Request a new OTP." });
    }

    const otpOk = await bcrypt.compare(otp, session.otpHash);
    if (!otpOk) {
      session.otpAttempts = Number(session.otpAttempts || 0) + 1;
      await session.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const duplicateMsg = await validateSignupUniqueness({
      email: session.payload?.email,
      studentId: session.payload?.studentId,
    });
    if (duplicateMsg) {
      await SignupOtpSession.deleteOne({ _id: session._id });
      return res.status(400).json({ message: duplicateMsg });
    }

    const user = await User.create({
      name: session.payload?.name,
      email: session.payload?.email,
      password: session.payload?.passwordHash,
      role: "student",
      isApproved: true, // Auto-approved for demo
      gender: session.payload?.gender,
      studentId: session.payload?.studentId,
      year: session.payload?.year,
      semester: session.payload?.semester,
      contactNo: session.payload?.contactNo,
      guardianName: session.payload?.guardianName,
      guardianContact: session.payload?.guardianContact,
      profileImage: session.payload?.profileImage,
      idCardImage: session.payload?.idCardImage,
    });

    await SignupOtpSession.deleteOne({ _id: session._id });

    return res.status(201).json({
      message: "Registered successfully. Await admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      year,
      semester,
      contactNo,
      guardianName,
      guardianContact,
      gender,
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (!gender || !GENDERS.includes(gender)) {
      return res
        .status(400)
        .json({ message: "gender is required and must be male or female" });
    }

    //files go to R2
    let profileImageUrl = null;
    let idCardImageUrl = null;

    if (req.files?.profileImage?.[0]) {
      const profileFile = req.files.profileImage[0];
      profileImageUrl = await uploadBufferToR2(
        profileFile.buffer,
        profileFile.originalname,
        profileFile.mimetype,
      );
    }

    if (req.files?.idCardImage?.[0]) {
      const idCardFile = req.files.idCardImage[0];
      idCardImageUrl = await uploadBufferToR2(
        idCardFile.buffer,
        idCardFile.originalname,
        idCardFile.mimetype,
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "student",
      isApproved: false,
      gender,
      studentId,
      year,
      semester,
      contactNo,
      guardianName,
      guardianContact,
      profileImage: profileImageUrl,
      idCardImage: idCardImageUrl,
    });

    res.status(201).json({
      message: "Registered successfully. Await admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (
      ["warden", "staff"].includes(user.role) &&
      user.mustChangePasswordOnFirstLogin
    ) {
      return res.status(200).json({
        passwordChangeRequired: true,
        message: "First login requires password change before account activation.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    if (user.role === "student" && !user.isApproved) {
      return res.status(403).json({
        message: "Account not approved yet",
        isApproved: false,
        role: user.role,
      });
    }

    const token = generateToken(user._id);
    user.lastLoginAt = new Date();
    user.lastActionAt = new Date();
    user.lastAction = "Logged in";
    await user.save();

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        gender: user.gender,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const FORGOT_PASSWORD_RESPONSE = {
  message:
    "If an account exists for this email, you will receive a reset code shortly.",
};

export const forgotPassword = async (req, res) => {
  try {
    const normalized = normalizeEmail(req.body?.email);
    if (!normalized) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne(emailQueryFilter(normalized));
    if (!user) {
      return res.status(200).json(FORGOT_PASSWORD_RESPONSE);
    }

    const otp = generateSixDigitOtp();
    const passwordResetOtpHash = await bcrypt.hash(otp, 10);
    const passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

    user.passwordResetOtpHash = passwordResetOtpHash;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    try {
      await sendPasswordResetOtpEmail(user.email, otp);
    } catch (err) {
      console.error("[forgotPassword] Brevo send failed:", err);
      user.passwordResetOtpHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }

    return res.status(200).json(FORGOT_PASSWORD_RESPONSE);
  } catch (error) {
    console.error("[forgotPassword]", error);
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const normalized = normalizeEmail(req.body?.email);
    const otpRaw = req.body?.otp;
    const newPassword = req.body?.newPassword;

    if (!normalized) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (otpRaw == null || String(otpRaw).trim() === "") {
      return res.status(400).json({ message: "Reset code is required" });
    }
    if (newPassword == null || String(newPassword).trim() === "") {
      return res.status(400).json({ message: "New password is required" });
    }

    const pwd = String(newPassword).trim();
    if (pwd.length < MIN_NEW_PASSWORD_LEN) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_NEW_PASSWORD_LEN} characters`,
      });
    }

    const user = await User.findOne(emailQueryFilter(normalized)).select(
      "+passwordResetOtpHash",
    );

    if (!user?.passwordResetOtpHash || !user.passwordResetExpires) {
      return res.status(400).json({
        message: "Invalid or expired reset code. Request a new code.",
      });
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      user.passwordResetOtpHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(400).json({
        message: "Invalid or expired reset code. Request a new code.",
      });
    }

    const ok = await bcrypt.compare(String(otpRaw).trim(), user.passwordResetOtpHash);
    if (!ok) {
      return res.status(400).json({
        message: "Invalid or expired reset code.",
      });
    }

    user.password = await bcrypt.hash(pwd, 10);
    user.passwordResetOtpHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -passwordResetOtpHash -passwordResetExpires",
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Student updates own profile (name, contact, guardian fields, optional profile photo). */
export const updateMyProfile = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Only students can update their profile here",
      });
    }

    const { name, contactNo, guardianName, guardianContact, year, semester } =
      req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = n;
    }
    if (contactNo !== undefined) {
      user.contactNo = String(contactNo).trim();
    }
    if (guardianName !== undefined) {
      user.guardianName = String(guardianName).trim();
    }
    if (guardianContact !== undefined) {
      user.guardianContact = String(guardianContact).trim();
    }
    if (year !== undefined && year !== null && String(year).trim() !== "") {
      const y = Number(year);
      if (!Number.isFinite(y)) {
        return res.status(400).json({ message: "Year must be a valid number" });
      }
      user.year = y;
    }
    if (
      semester !== undefined &&
      semester !== null &&
      String(semester).trim() !== ""
    ) {
      const s = Number(semester);
      if (!Number.isFinite(s)) {
        return res
          .status(400)
          .json({ message: "Semester must be a valid number" });
      }
      user.semester = s;
    }

    if (req.files?.profileImage?.[0]) {
      const profileFile = req.files.profileImage[0];
      user.profileImage = await uploadBufferToR2(
        profileFile.buffer,
        profileFile.originalname,
        profileFile.mimetype,
      );
    }

    await user.save();

    const fresh = await User.findById(user._id).select(
      "-password -passwordResetOtpHash -passwordResetExpires",
    );

    res.json({ message: "Profile updated successfully", user: fresh });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Authenticated user changes password (current password required; no OTP). */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || String(currentPassword).trim() === "") {
      return res.status(400).json({ message: "Current password is required" });
    }
    if (!newPassword || String(newPassword).trim() === "") {
      return res.status(400).json({ message: "New password is required" });
    }

    const pwd = String(newPassword).trim();
    if (pwd.length < MIN_NEW_PASSWORD_LEN) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_NEW_PASSWORD_LEN} characters`,
      });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(String(currentPassword), user.password);
    if (!ok) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    user.password = await bcrypt.hash(pwd, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Authenticated user deletes their own account (password required). */
export const deleteMyAccount = async (req, res) => {
  try {
    const { password } = req.body ?? {};
    if (!password || String(password).trim() === "") {
      return res.status(400).json({
        message: "Password is required to delete your account",
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be deleted from the app",
      });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const bookings = await Booking.find({ student: userId });
    for (const booking of bookings) {
      if (booking.bookingStatus === "confirmed") {
        const room = await Room.findById(booking.room);
        if (room) {
          room.currentOccupancy = Math.max(
            0,
            Number(room.currentOccupancy) - 1,
          );
          room.availabilityStatus = recalculateRoomAvailability({
            currentOccupancy: room.currentOccupancy,
            capacity: room.capacity,
            status: room.availabilityStatus,
          });
          await room.save();
        }
      }
    }

    await Booking.deleteMany({ student: userId });
    await Notification.deleteMany({
      $or: [{ recipient: userId }, { actor: userId }],
    });
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: false, role: "student" });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApprovedStudents = async (req, res) => {
  try {
    const users = await User.find({ isApproved: true, role: "student" }).sort({
      name: 1,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWardens = async (req, res) => {
  try {
    const users = await User.find({ role: "warden" }).sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveStudent = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true },
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Student approved", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: "Invalid admin secret key" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
      isApproved: true,
      lastActionAt: new Date(),
      lastAction: "Admin account created",
    });
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        lastActionAt: new Date(),
        lastAction: "Created admin account",
      });
    }
    await writeAdminAuditLog({
      action: "create_admin",
      actorId: req.user?.id,
      targetAdminId: admin._id,
      details: `Created admin ${admin.email}`,
    });

    res.status(201).json({
      message: "Admin account created successfully",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createWarden = async (req, res) => {
  try {
    const { name, email, password, nicNumber } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const nicParsed = parseNic(nicNumber);
    if (!nicParsed.ok) {
      return res.status(400).json({ message: nicParsed.message });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const nicTaken = await User.findOne({ nicNumber: nicParsed.normalized });
    if (nicTaken) {
      return res.status(400).json({ message: "This NIC is already registered" });
    }

    let nicPhotoUrl;
    const nicFile = req.files?.nicPhoto?.[0];
    if (nicFile?.buffer) {
      nicPhotoUrl = await uploadBufferToR2(
        nicFile.buffer,
        nicFile.originalname,
        nicFile.mimetype,
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const warden = await User.create({
      name,
      email,
      password: hashed,
      role: "warden",
      isApproved: true,
      mustChangePasswordOnFirstLogin: true,
      invitedByRole: "admin",
      invitedBy: req.user?.id,
      nicNumber: nicParsed.normalized,
      ...(nicPhotoUrl ? { nicPhoto: nicPhotoUrl } : {}),
    });

    try {
      await sendOperationalAccountInvitationEmail({
        toEmail: warden.email,
        name: warden.name,
        role: "warden",
        temporaryPassword: password,
        invitedByRole: "admin",
      });
    } catch (emailError) {
      console.error("[createWarden] Invitation email failed:", emailError);
    }

    const safe = warden.toObject();
    delete safe.password;
    res.status(201).json({
      message: "Warden account created successfully",
      user: safe,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changeFirstLoginPassword = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "").trim();

    if (!normalizedEmail || !currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Email, currentPassword, and newPassword are required",
      });
    }
    if (newPassword.length < FIRST_LOGIN_PASSWORD_MIN_LEN) {
      return res.status(400).json({
        message: `Password must be at least ${FIRST_LOGIN_PASSWORD_MIN_LEN} characters`,
      });
    }

    const user = await User.findOne(emailQueryFilter(normalizedEmail)).select(
      "+password",
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!["warden", "staff"].includes(user.role)) {
      return res.status(403).json({ message: "First-login flow is only for staff and wardens" });
    }
    if (!user.mustChangePasswordOnFirstLogin) {
      return res.status(400).json({ message: "First-login password change is not required" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePasswordOnFirstLogin = false;
    user.firstPasswordChangedAt = new Date();
    await user.save();

    try {
      await sendOperationalAccountActivatedEmail({
        toEmail: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (emailError) {
      console.error("[changeFirstLoginPassword] Activation email failed:", emailError);
    }

    return res.json({
      message: "Password changed successfully. Your account is now active.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const role = req.query?.role ? String(req.query.role) : null;
    const search = req.query?.search ? String(req.query.search).trim() : "";
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminAuditLogs = async (req, res) => {
  try {
    const action = req.query?.action ? String(req.query.action).trim() : "";
    const actorSearch = req.query?.actor ? String(req.query.actor).trim() : "";
    const from = req.query?.from ? new Date(String(req.query.from)) : null;
    const to = req.query?.to ? new Date(String(req.query.to)) : null;

    const filter = {};
    if (action && action !== "all") filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from && !Number.isNaN(from.getTime())) filter.createdAt.$gte = startOfDay(from);
      if (to && !Number.isNaN(to.getTime())) {
        const end = startOfDay(to);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    let logs = await AdminAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actor", "name email")
      .populate("targetAdmin", "name email");
    if (actorSearch) {
      const q = actorSearch.toLowerCase();
      logs = logs.filter((log) => {
        const actorName = String(log.actor?.name || "").toLowerCase();
        const actorEmail = String(log.actor?.email || "").toLowerCase();
        return actorName.includes(q) || actorEmail.includes(q);
      });
    }
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminMetrics = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [totalAdmins, activeAdmins, inactiveAdmins, recentLogins, recentActions] =
      await Promise.all([
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "admin", isApproved: true }),
        User.countDocuments({ role: "admin", isApproved: false }),
        User.countDocuments({ role: "admin", lastLoginAt: { $gte: sevenDaysAgo } }),
        AdminAuditLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      ]);

    res.json({
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      recentLogins,
      recentActions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isAdminTarget = user.role === "admin";
    if (req.user?.id && String(user._id) === String(req.user.id)) {
      return res.status(403).json({ message: "You cannot delete your own account" });
    }
    if (isAdminTarget) {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res
          .status(403)
          .json({ message: "Cannot delete the last remaining admin account" });
      }
    }
    await User.findByIdAndDelete(id);
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        lastActionAt: new Date(),
        lastAction: "Deleted admin account",
      });
    }
    if (isAdminTarget) {
      await writeAdminAuditLog({
        action: "delete_admin",
        actorId: req.user?.id,
        targetAdminId: user._id,
        details: `Deleted admin ${user.email}`,
      });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      year,
      semester,
      contactNo,
      guardianName,
      guardianContact,
      gender,
      isApproved,
      nicNumber,
    } = req.body;

    const target = await User.findById(req.params.id).select("+password");
    if (!target) return res.status(404).json({ message: "User not found" });
    const isAdminTarget = target.role === "admin";

    if (target.role === "warden") {
      if (nicNumber !== undefined && nicNumber !== null && nicNumber !== "") {
        const parsed = parseNic(nicNumber);
        if (!parsed.ok) {
          return res.status(400).json({ message: parsed.message });
        }
        const dup = await User.findOne({
          nicNumber: parsed.normalized,
          _id: { $ne: target._id },
        });
        if (dup) {
          return res.status(400).json({ message: "This NIC is already registered" });
        }
        target.nicNumber = parsed.normalized;
      }
      const nicFile = req.files?.nicPhoto?.[0];
      if (nicFile?.buffer) {
        target.nicPhoto = await uploadBufferToR2(
          nicFile.buffer,
          nicFile.originalname,
          nicFile.mimetype,
        );
      }
    }

    if (email && email !== target.email) {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      target.email = email;
    }

    if (name !== undefined) target.name = name;
    if (studentId !== undefined) target.studentId = studentId;
    if (year !== undefined) {
      const y = Number(year);
      if (Number.isFinite(y)) target.year = y;
    }
    if (semester !== undefined) {
      const s = Number(semester);
      if (Number.isFinite(s)) target.semester = s;
    }
    if (contactNo !== undefined) target.contactNo = contactNo;
    if (guardianName !== undefined) target.guardianName = guardianName;
    if (guardianContact !== undefined) target.guardianContact = guardianContact;

    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) {
        return res.status(400).json({ message: "gender must be male or female" });
      }
      target.gender = gender;
    }
    if (isApproved !== undefined) {
      target.isApproved = Boolean(isApproved);
    }

    if (password && String(password).trim() !== "") {
      target.password = await bcrypt.hash(password, 10);
    }
    target.lastActionAt = new Date();
    target.lastAction = "Profile updated";

    await target.save();
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        lastActionAt: new Date(),
        lastAction: isAdminTarget ? "Updated admin account" : "Updated user account",
      });
    }
    if (isAdminTarget) {
      const statusLabel =
        isApproved === undefined
          ? "Updated admin account"
          : isApproved
            ? "Activated admin account"
            : "Deactivated admin account";
      await writeAdminAuditLog({
        action: "update_admin",
        actorId: req.user?.id,
        targetAdminId: target._id,
        details: `${statusLabel}: ${target.email}`,
      });
    }

    const safe = target.toObject();
    delete safe.password;
    res.json({ message: "User updated successfully", user: safe });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
