const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes.js");
const chatRoutes = require("./routes/chat.routes.js");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://ragmatechatapp-ai.onrender.com",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RagMate AI Backend is Running!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Frontend build path
const frontendPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "dist"
);

// Serve frontend
app.use(express.static(frontendPath));

// React fallback
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"), (error) => {
    if (error) {
      console.error("Frontend build error:", error);
      res.status(404).send("Frontend build not found");
    }
  });
});

module.exports = app;