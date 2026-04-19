import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadBufferToR2 } from "../utils/r2Upload.js";

const GENDERS = ["male", "female"];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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

    if (user.role === "student" && !user.isApproved) {
      return res.status(403).json({
        message: "Account not approved yet",
        isApproved: false,
        role: user.role,
      });
    }

    const token = generateToken(user._id);

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

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const warden = await User.create({
      name,
      email,
      password: hashed,
      role: "warden",
      isApproved: true,
    });

    res.status(201).json({
      message: "Warden account created successfully",
      user: {
        id: warden._id,
        name: warden.name,
        email: warden.email,
        role: warden.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
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
    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot delete an admin account" });
    }
    await User.findByIdAndDelete(id);
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
    } = req.body;

    const target = await User.findById(req.params.id).select("+password");
    if (!target) return res.status(404).json({ message: "User not found" });

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

    if (password && String(password).trim() !== "") {
      target.password = await bcrypt.hash(password, 10);
    }

    await target.save();

    const safe = target.toObject();
    delete safe.password;
    res.json({ message: "User updated successfully", user: safe });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
