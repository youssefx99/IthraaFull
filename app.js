const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { connectToDB } = require("./utils/connect");
const userRoute = require("./router/userRoute");
const path = require("path");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const app = express();
connectToDB();

app.use(express.static(path.join(__dirname, "client/")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend origin
    credentials: true, // Allow cookies to be sent an d received
  })
);

// Connect to MongoDB

// Routes
app.use("/api/", userRoute);

const allowedRoutes = [
  "/",
  "/create",
  "/loginforadmin",
  "/students",
  "/edit-contract",
];

app.get(allowedRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// Handle all other requests with a 404 Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
  });
});

// // ✅ Global Error Handler Middleware (Ensures the server does NOT crash)
// app.use((err, req, res, next) => {
//   console.error("🔥 ERROR:", err.stack || err.message);

//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

// // ✅ Catch Unhandled Promise Rejections
// process.on("unhandledRejection", (reason, promise) => {
//   console.error("🚨 Unhandled Promise Rejection:", reason);
// });

// // ✅ Catch Uncaught Exceptions
// process.on("uncaughtException", (err) => {
//   console.error("💥 Uncaught Exception:", err);
// });

// Start Server
const PORT = process.env.PORT || 3080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
