require("dotenv").config();
const mongoose = require("mongoose");
const mockMongoose = require("./services/mockMongoose");

// Enable the hybrid mock layer immediately
mockMongoose.enableMockMode();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/attendance_db";

console.log("Connecting to MongoDB (unless USE_SQLITE=true)...");

const USE_SQLITE =
  String(process.env.USE_SQLITE || "").toLowerCase() === "true";

if (USE_SQLITE) {
  console.log("SQLite-only mode enabled; skipping MongoDB connection.");
  const seedDatabase = require("./seed");
  seedDatabase().catch((e) =>
    console.error("Failed to auto-seed SQLite-backed mock DB:", e.message),
  );
} else {
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000, // Fail fast if MongoDB is not running locally
    })
    .then(() => {
      console.log("Connected to MongoDB successfully.");
    })
    .catch((err) => {
      console.log(
        "Mongoose connection failed. Operating in hybrid Mock In-Memory DB Mode.",
      );
      // Auto-seed in-memory collection arrays
      const seedDatabase = require("./seed");
      seedDatabase().catch((e) =>
        console.error("Failed to auto-seed in-memory DB:", e.message),
      );
    });
}

module.exports = {
  connection: mongoose.connection,
  close: (cb) => {
    mongoose.connection
      .close()
      .then(() => {
        console.log("MongoDB connection closed.");
        if (cb) cb();
      })
      .catch((err) => {
        console.error("Error closing MongoDB connection:", err.message);
        if (cb) cb(err);
      });
  },
};
