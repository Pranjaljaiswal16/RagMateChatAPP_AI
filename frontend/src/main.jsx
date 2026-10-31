import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  ArrowDown,
  ArrowUp,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquarePlus,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";

import "./styles.css";

const API_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : "";

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
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

const suggestions = [
  { title: "Plan my day", prompt: "Help me plan a focused and realistic day." },
  { title: "Explain a concept", prompt: "Explain how retrieval augmented generation works in simple terms." },
  { title: "Write something", prompt: "Help me write a clear, thoughtful message." },
];

function Avatar({ user, small = false }) {
  const initials = `${user?.fullName?.firstName?.[0] || "R"}${user?.fullName?.lastName?.[0] || ""}`;
  return <span className={`avatar ${small ? "avatar-small" : ""}`}>{initials.toUpperCase()}</span>;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : {
          fullName: { firstName: form.firstName, lastName: form.lastName },
          email: form.email,
          password: form.password,
        };
      const data = await request(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-story">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span> RagMate</div>
        <div className="story-copy">
          <p className="eyebrow">A little more context. A lot more clarity.</p>
          <h1>Good questions<br />deserve <em>better</em><br />conversations.</h1>
          <p>Talk things through with an AI that can bring useful context back into the conversation.</p>
        </div>
        <div className="story-foot"><span className="story-dot" /> Your space to think out loud</div>
        <span className="story-orbit orbit-a" /><span className="story-orbit orbit-b" />
      </aside>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="mobile-brand brand"><span className="brand-mark"><Sparkles size={17} /></span> RagMate</div>
          <p className="eyebrow">YOUR AI CHAT SPACE</p>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-subtitle">{mode === "login" ? "Sign in and pick up where your thoughts left off." : "A thoughtful chat starts with a little introduction."}</p>
          <div className="auth-toggle" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Log in</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Sign up</button>
          </div>
          {mode === "register" && <div className="name-fields">
            <label>First name<input autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
            <label>Last name<input autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
          </div>}
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "One moment…" : mode === "login" ? "Continue to RagMate" : "Create account"}<ArrowUp size={17} /></button>
          <p className="auth-privacy">Your conversations stay in your account.</p>
        </form>
      </section>
    </div>
  );
}

function ChatApp({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatError, setChatError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const socketRef = useRef(null);
  const activeChatRef = useRef(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => {
    request("/api/chat")
      .then(({ chats: loaded }) => setChats(loaded || []))
      .catch((err) => setChatError(err.message));
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => { setConnected(true); setChatError(""); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => { setConnected(false); setChatError(err.message || "Could not connect to chat."); });
    socket.on("ai-response", (payload) => {
      if (payload.chat !== activeChatRef.current?._id) return;
      setSending(false);
      if (payload.error) {
        setChatError(payload.error);
        return;
      }
      setChatError("");
      setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: "model", content: payload.content }]);
      setChats((current) => current.map((chat) => chat._id === payload.chat ? { ...chat, lastActivity: new Date().toISOString() } : chat).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)));
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function openChat(chat) {
    setActiveChat(chat);
    activeChatRef.current = chat;
    setMessages([]);
    setChatError("");
    setSending(false);
    setSidebarOpen(false);
    setLoadingMessages(true);
    try {
      const data = await request(`/api/chat/${chat._id}/messages`);
      if (activeChatRef.current?._id === chat._id) setMessages(data.messages || []);
    } catch (err) {
      if (activeChatRef.current?._id === chat._id) setChatError(err.message);
    } finally {
      setLoadingMessages(false);
    }
  }

  function startNewChat() {
    activeChatRef.current = null;
    setActiveChat(null);
    setMessages([]);
    setDraft("");
    setChatError("");
    setSending(false);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  async function sendMessage(text = draft) {
    const content = text.trim();
    if (!content || sending) return;
    if (!socketRef.current?.connected) {
      setChatError("Chat is reconnecting. Please try again in a moment.");
      return;
    }
    setChatError("");
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content }]);
    try {
      let chat = activeChatRef.current;
      if (!chat) {
        const result = await request("/api/chat", { method: "POST", body: JSON.stringify({ title: content.slice(0, 56) || "New chat" }) });
        chat = result.chat;
        activeChatRef.current = chat;
        setActiveChat(chat);
        setChats((current) => [chat, ...current.filter((item) => item._id !== chat._id)]);
      }
      socketRef.current.emit("ai-message", { chat: chat._id, content });
    } catch (err) {
      setSending(false);
      setChatError(err.message);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function logout() {
    try { await request("/api/auth/logout", { method: "POST" }); } catch (err) { console.error("Logout failed:", err); }
    onLogout();
  }

  return (
    <main className="chat-layout">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); startNewChat(); }}><span className="brand-mark"><Sparkles size={16} /></span> RagMate</a>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><PanelLeftClose size={18} /></button>
        </div>
        <button className="new-chat-button" onClick={startNewChat}><MessageSquarePlus size={17} /> New chat <span>⌘ K</span></button>
        <div className="sidebar-section-title">Recent conversations</div>
        <div className="chat-list">
          {chats.length ? chats.map((chat) => <button key={chat._id} className={`chat-link ${activeChat?._id === chat._id ? "active" : ""}`} onClick={() => openChat(chat)}><MessageCircle size={15} /><span>{chat.title}</span></button>) : <p className="empty-history">Your conversations will appear here.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="memory-note"><span className="memory-icon"><Sparkles size={15} /></span><div><strong>Context that sticks</strong><small>RagMate can recall useful details</small></div></div>
          <div className="user-row"><Avatar user={user} /><div className="user-details"><strong>{user.fullName?.firstName} {user.fullName?.lastName}</strong><small>{user.email}</small></div><button className="logout-button" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={17} /></button></div>
        </div>
      </aside>

      <section className="chat-main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="topbar-title"><span className="topbar-kicker">YOUR PERSONAL AI</span><strong>{activeChat?.title || "New conversation"}</strong></div>
          <div className={`connection ${connected ? "online" : ""}`}><span />{connected ? "Connected" : "Connecting…"}</div>
        </header>

        <div className="conversation">
          {loadingMessages ? <div className="loading-state"><span className="loading-spinner" />Opening conversation…</div> : messages.length === 0 ? (
            <div className="welcome-state">
              <div className="welcome-icon"><Sparkles size={24} /></div>
              <p className="eyebrow">A CLEARER WAY TO THINK</p>
              <h1>What’s on your mind?</h1>
              <p className="welcome-copy">Ask a question, explore an idea, or pick up a thread.<br className="desktop-break" /> RagMate will use relevant context to make its answer more helpful.</p>
              <div className="suggestion-grid">{suggestions.map((item) => <button key={item.title} onClick={() => sendMessage(item.prompt)}><span>{item.title}</span><ArrowUp size={15} /></button>)}</div>
            </div>
          ) : <div className="messages">{messages.map((message) => <article key={message._id || message.id} className={`message-row ${message.role === "user" ? "user-message" : "ai-message"}`}>
            {message.role !== "user" && <span className="message-avatar"><Sparkles size={14} /></span>}
            <div className="message-content"><div className="message-label">{message.role === "user" ? "You" : "RagMate"}</div><div className="message-bubble">{message.content}</div></div>
            {message.role === "user" && <Avatar user={user} small />}
          </article>)}{sending && <article className="message-row ai-message"><span className="message-avatar"><Sparkles size={14} /></span><div className="message-content"><div className="message-label">RagMate is thinking</div><div className="message-bubble typing"><i /><i /><i /></div></div></article>}<div ref={bottomRef} /></div>}
        </div>

        <div className="composer-area">
          {chatError && <p className="chat-error" role="status">{chatError}</p>}
          <div className="composer"><textarea ref={textareaRef} value={draft} onChange={(event) => { setDraft(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`; }} onKeyDown={handleComposerKeyDown} placeholder="Message RagMate…" rows={1} aria-label="Write a message" /><div className="composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button className="send-button" disabled={!draft.trim() || sending} onClick={() => sendMessage()} aria-label="Send message"><ArrowUp size={18} /></button></div></div>
          <p className="composer-note">RagMate can make mistakes. Check important information.</p>
        </div>
      </section>
      <button className="scroll-bottom" onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })} aria-label="Scroll to latest"><ArrowDown size={16} /></button>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  return <main className="app-shell">{user ? <ChatApp user={user} onLogout={() => setUser(null)} /> : <AuthScreen onAuth={setUser} />}</main>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
