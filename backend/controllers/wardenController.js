import User from "../models/User.js";

// @desc    Get counts for the Warden Dashboard (Total Students, Staff, etc.)
export const getWardenStats = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const approvedStudents = await User.countDocuments({ role: 'student', isApproved: true });
        const totalWardens = await User.countDocuments({ role: 'warden' });

        res.json({
            totalStudents,
            pendingApprovals: totalStudents - approvedStudents,
            totalWardens
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Advanced Staff Search (Search by name or email)
export const searchStaff = async (req, res) => {
    try {
        const { query } = req.query;
        const staff = await User.find({
            role: 'warden',
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select("-password");
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a user from the system (Security/Cleanup)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};