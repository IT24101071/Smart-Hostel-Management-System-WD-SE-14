import User from "../models/User.js"; // Ensure the file name matches exactly

// @desc    Get all staff members for the warden
export const getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new staff member (Admin/Warden only)
export const addStaff = async (req, res) => {
    const { name, email, password, staffSpecialization } = req.body;
    try {
        const staffExists = await User.findOne({ email });
        if (staffExists) return res.status(400).json({ message: "Staff already exists" });

        const newStaff = await User.create({
            name,
            email,
            password, // Note: Your auth layer should handle hashing in the model
            role: 'staff',
            staffSpecialization
        });
        res.status(201).json(newStaff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};