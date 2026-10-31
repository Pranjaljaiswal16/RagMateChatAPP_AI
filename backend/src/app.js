const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes.js");
const chatRoutes = require("./routes/chat.routes.js");

const app = express();

// Allowed frontend URLs
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://ragmatechatapp-ai.onrender.com",
  "http://localhost:5173",
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RagMate AI Backend is Running!",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Frontend static files
app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

module.exports = app;
