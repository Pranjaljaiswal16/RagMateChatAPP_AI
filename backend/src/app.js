
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

// CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Frontend path
const frontendPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "dist"
);

// Serve frontend files
app.use(express.static(frontendPath));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RagMate AI Backend is Running!",
  });
});

// React fallback
app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(frontendPath, "index.html"),
    (error) => {
      if (error) {
        console.error("Frontend build error:", error);
        res.status(404).send("Frontend build not found");
      }
    }
  );
});

module.exports = app;
