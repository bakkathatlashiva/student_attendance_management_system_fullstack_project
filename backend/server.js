require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const http = require("http");

const db = require("./db");
const socketService = require("./services/socket");

const app = express();
const server = http.createServer(app);

// Initialize Sockets.io
socketService.init(server);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows loading custom CDN resources
  }),
);

// Apply Rate Limiter to API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many requests from this IP. Please try again later." },
});
app.use("/api/", apiLimiter);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent NoSQL query injection
app.use(mongoSanitize());

// Mount API Routers
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/subjects", require("./routes/subjects"));
app.use("/api/timetable", require("./routes/timetable"));
app.use("/api/leave", require("./routes/leave"));
app.use("/api/audit-logs", require("./routes/audit"));

// Backend Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "College ERP Backend operating at peak capacity.",
    time: new Date(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("ERP Server Error:", err.stack);
  res.status(err.status || 500).json({
    msg: err.message || "A critical server error occurred.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Enterprise College ERP server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log("Initiating graceful shutdown...");
  server.close(() => {
    db.close(() => {
      console.log("ERP processes terminated. Bye.");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("Force exit triggered.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
