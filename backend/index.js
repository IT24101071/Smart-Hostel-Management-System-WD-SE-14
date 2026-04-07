import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import wardenRoutes from "./routes/wardenRoutes.js"; // 1. Import your routes

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/warden", wardenRoutes); // 2. Add this line

app.get("/health", (req, res) => res.send("API is running!"));

app.listen(3000, () => console.log("Server on port 3000"));