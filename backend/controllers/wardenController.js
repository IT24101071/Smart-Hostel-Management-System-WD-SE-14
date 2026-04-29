import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

const STAFF_ROLE = "staff";
const SEARCH_LIMIT_MAX = 100;
const DEFAULT_PAGE_SIZE = 20;

// @desc    Get counts for the Warden Dashboard (Total Students, Staff, etc.)
export const getWardenStats = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const approvedStudents = await User.countDocuments({ role: 'student', isApproved: true });
        const totalStaff = await User.countDocuments({ role: STAFF_ROLE });
        const totalWardens = await User.countDocuments({ role: 'warden' });

        res.json({
            totalStudents,
            pendingApprovals: totalStudents - approvedStudents,
            totalStaff,
            totalWardens
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEmail(email) {
    return String(email ?? "").trim().toLowerCase();
}

function getPaginationParams(query = {}) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(SEARCH_LIMIT_MAX, Number(query.limit || DEFAULT_PAGE_SIZE)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

function getSafeUser(user) {
    if (!user) return null;
    const safe = user.toObject ? user.toObject() : { ...user };
    delete safe.password;
    return safe;
}

function requireStaffTarget(target, res) {
    if (!target) {
        res.status(404).json({ message: "Staff user not found" });
        return false;
    }
    if (target.role !== STAFF_ROLE) {
        res.status(400).json({ message: "This endpoint only manages staff accounts" });
        return false;
    }
    return true;
}

// @desc    Advanced Staff Search (Search by name or email)
export const searchStaff = async (req, res) => {
    try {
        const raw = req.query.query;
        const trimmed = typeof raw === "string" ? raw.trim() : "";
        if (!trimmed) {
            return res.json([]);
        }
        const safe = escapeRegex(trimmed).slice(0, 120);
        const staff = await User.find({
            role: STAFF_ROLE,
            $or: [
                { name: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(SEARCH_LIMIT_MAX)
            .select("-password");
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    List staff with search/filter/pagination
export const getStaffList = async (req, res) => {
    try {
        const q = String(req.query?.q ?? "").trim();
        const active = String(req.query?.active ?? "").trim().toLowerCase();
        const { page, limit, skip } = getPaginationParams(req.query);

        const filter = { role: STAFF_ROLE };
        if (q) {
            const safe = escapeRegex(q).slice(0, 120);
            filter.$or = [
                { name: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
            ];
        }
        if (active === "true") filter.isApproved = true;
        if (active === "false") filter.isApproved = false;

        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-password"),
        ]);
        const activeCount = await User.countDocuments({ role: STAFF_ROLE, isApproved: true });
        const totalStaff = await User.countDocuments({ role: STAFF_ROLE });

        res.json({
            data: users.map(getSafeUser),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                totalStaff,
                activeStaff: activeCount,
                inactiveStaff: Math.max(0, totalStaff - activeCount),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new staff account
export const createStaff = async (req, res) => {
    try {
        const name = String(req.body?.name ?? "").trim();
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? "");

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required",
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters",
            });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: STAFF_ROLE,
            isApproved: true,
        });

        res.status(201).json({
            message: "Staff account created successfully",
            user: getSafeUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Edit staff profile fields
export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const target = await User.findById(id).select("+password");
        if (!requireStaffTarget(target, res)) return;

        const name = req.body?.name;
        const email = req.body?.email;
        const password = req.body?.password;

        if (name !== undefined) {
            const nextName = String(name).trim();
            if (!nextName) return res.status(400).json({ message: "Name cannot be empty" });
            target.name = nextName;
        }

        if (email !== undefined) {
            const nextEmail = normalizeEmail(email);
            if (!nextEmail) return res.status(400).json({ message: "Email cannot be empty" });
            if (nextEmail !== target.email) {
                const exists = await User.findOne({ email: nextEmail, _id: { $ne: target._id } });
                if (exists) {
                    return res.status(400).json({ message: "Email already in use" });
                }
                target.email = nextEmail;
            }
        }

        if (password !== undefined) {
            const nextPassword = String(password).trim();
            if (nextPassword) {
                if (nextPassword.length < 6) {
                    return res.status(400).json({ message: "Password must be at least 6 characters" });
                }
                target.password = await bcrypt.hash(nextPassword, 10);
            }
        }

        await target.save();
        res.json({ message: "Staff updated successfully", user: getSafeUser(target) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Activate/deactivate staff account
export const toggleStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }
        if (req.user?.id && String(req.user.id) === String(id)) {
            return res.status(403).json({ message: "You cannot deactivate your own account" });
        }

        const target = await User.findById(id);
        if (!requireStaffTarget(target, res)) return;

        if (typeof req.body?.isApproved !== "boolean") {
            return res.status(400).json({ message: "isApproved must be boolean" });
        }
        target.isApproved = req.body.isApproved;
        await target.save();

        res.json({
            message: target.isApproved ? "Staff activated" : "Staff deactivated",
            user: getSafeUser(target),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a user from the system (Security/Cleanup)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const actorId = req.user?.id ?? req.user?._id;
        if (actorId && String(user._id) === String(actorId)) {
            return res.status(403).json({ message: "You cannot delete your own account from here" });
        }

        if (req.user?.role === "warden") {
            if (user.role !== "student") {
                return res.status(403).json({
                    message: "Wardens can only remove student accounts",
                });
            }
        } else if (req.user?.role === "admin") {
            if (user.role === "admin") {
                const adminCount = await User.countDocuments({ role: "admin" });
                if (adminCount <= 1) {
                    return res.status(403).json({
                        message: "Cannot delete the last remaining admin account",
                    });
                }
            }
        }

        await User.findByIdAndDelete(id);
        res.json({ message: "User removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a staff account from the system
export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const actorId = req.user?.id ?? req.user?._id;
        if (actorId && String(actorId) === String(id)) {
            return res.status(403).json({ message: "You cannot delete your own account from here" });
        }

        const target = await User.findById(id);
        if (!requireStaffTarget(target, res)) return;

        await User.findByIdAndDelete(id);
        res.json({ message: "Staff removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};