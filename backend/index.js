import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/room.routes.js"; // From main
import wardenRoutes from "./routes/wardenRoutes.js"; // Your work

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);   // From main
app.use("/api/warden", wardenRoutes); // Your work

app.get("/health", (req, res) => res.send("API is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));