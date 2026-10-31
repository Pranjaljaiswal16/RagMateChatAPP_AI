import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";

import {
  ArrowUp,
  ChevronDown,
  Menu,
  MessageSquarePlus,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";

import "./styles.css";

// Backend URL
const API_URL = "https://ragmate-chatapp.onrender.com";

// API Request Function
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Suggestions
const suggestions = [
  ["Plan my day", "Help me plan a focused and realistic day."],
  ["Write something", "Write a concise, thoughtful message for me."],
  ["Learn a concept", "Explain a useful concept in a simple way."],
];

// Avatar
function Avatar({ user, small = false }) {
  const initials = user?.fullName
    ? `${user.fullName.firstName?.[0] || ""}${user.fullName.lastName?.[0] || ""}`
    : "LU";

  return (
    <div className={`avatar ${small ? "avatar-small" : ""}`}>
      {initials.toUpperCase()}
    </div>
  );
}

// Authentication Screen
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const body =
        mode === "login"
          ? {
              email: form.email,
              password: form.password,
            }
          : {
              fullName: {
                firstName: form.firstName,
                lastName: form.lastName,
              },
              email: form.email,
              password: form.password,
            };

      const data = await request(
        `/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form onSubmit={handleSubmit}>
        <h1>Welcome to RagMate</h1>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "active" : ""}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "active" : ""}
          >
            Sign Up
          </button>
        </div>

        {mode === "register" && (
          <>
            <label>
              First Name
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Last Name
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </label>
          </>
        )}

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>
      </form>
    </div>
  );
}

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket error:", error.message);
      setConnected(false);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <main className="app-shell">
      {user ? (
        <div>
          <h1>Welcome to RagMate, {user.fullName?.firstName}!</h1>
          <p>Socket Status: {connected ? "Connected" : "Disconnected"}</p>
        </div>
      ) : (
        <AuthScreen onAuth={setUser} />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
