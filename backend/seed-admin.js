import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import 'dotenv/config';
import User from "./models/User.js";

async function seedAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const email = "admin@smart.hostel";
    const password = "adminpassword123";

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists!`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: "Super Admin",
      email: email,
      password: hashedPassword,
      role: "admin",
      isApproved: true,
    });

    console.log("==========================================");
    console.log("✅ Admin account successfully created!");
    console.log(`Email    : ${admin.email}`);
    console.log(`Password : ${password}`);
    console.log("==========================================");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

seedAdmin();
