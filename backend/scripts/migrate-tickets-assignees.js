/**
 * One-time migration: copy legacy `assignedTo` into `assignees: [id]` and unset `assignedTo`.
 * Run from backend/: `node scripts/migrate-tickets-assignees.js`
 * Requires MONGO_URI in .env
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI is not set");
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection("tickets");

const result = await col.updateMany(
  {
    assignedTo: { $exists: true, $ne: null },
    $or: [{ assignees: { $exists: false } }, { assignees: { $size: 0 } }],
  },
  [{ $set: { assignees: ["$assignedTo"] } }, { $unset: "assignedTo" }],
);

console.log(
  `migrate-tickets-assignees: matched ${result.matchedCount}, modified ${result.modifiedCount}`,
);

await mongoose.disconnect();
process.exit(0);
