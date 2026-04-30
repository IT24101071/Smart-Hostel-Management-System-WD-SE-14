import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js"; // From main
import wardenRoutes from "./routes/warden.routes.js"; // Your work
import bookingRoutes from "./routes/booking.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import paymentRoutes from "./routes/payment.routes.js"; // Payment management
import uploadRoutes from "./routes/upload.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import visitorRoutes from "./routes/visitor.routes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes); // From main
app.use("/api/warden", wardenRoutes); // Your work
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes); // Payment management
app.use("/api/upload", uploadRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/visitors", visitorRoutes);

app.get("/health", (req, res) => res.send("API is running!"));

const PORT = process.env.PORT || 5000;
// Listen on all interfaces so phones/emulators on the LAN can reach the API (not only 127.0.0.1).
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server on port ${PORT} (0.0.0.0)`),
);
