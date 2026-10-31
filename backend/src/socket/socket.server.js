const { parse } = require("cookie");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const userModel = require("../models/auth.model.js");
const messageModel = require("../models/message.model.js");
const chatModel = require("../models/chat.model.js");

const { createMemory, queryMemory } = require("../services/vector.service.js");

const aiService = require("../services/ai.service.js");

// Initialize Socket.IO
function initSocketServer(httpServer) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://ragmatechatapp-ai.onrender.com",
    "http://localhost:5173",
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing");
      }

      const cookieHeader = socket.handshake.headers?.cookie || "";
      const cookies = parse(cookieHeader);
      const token = cookies.token;

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // JWT was created using { id: user._id }
      const user = await userModel.findById(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;

      next();
    } catch (error) {
      console.error("Socket Auth Error:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // User connection
  io.on("connection", (socket) => {
    console.log("User connected:", socket.user._id.toString());

    // AI message event
    socket.on("ai-message", async (messagePayload) => {
      try {
        const chatId = messagePayload?.chat;
        const content =
          typeof messagePayload?.content === "string"
            ? messagePayload.content.trim()
            : "";

        // Validate message
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId) || !content) {
          return socket.emit("ai-response", {
            error: "Invalid message payload",
          });
        }

        // Verify chat ownership
        const chat = await chatModel.findOne({
          _id: chatId,
          user: socket.user._id,
        });

        if (!chat) {
          return socket.emit("ai-response", {
            error: "Unauthorized chat",
          });
        }

        // Save user message and generate its vector
        const userMessage = await messageModel.create({
          chat: chatId,
          user: socket.user._id,
          content,
          role: "user",
        });

        const userVector = await aiService.generateVector(content);

        // Save user memory in Pinecone
        await createMemory({
          vectors: userVector,
          messageId: userMessage._id,
          metadata: {
            chat: chatId.toString(),
            user: socket.user._id.toString(),
            text: content,
            role: "user",
          },
        });

        // Update chat activity
        await chatModel.findByIdAndUpdate(chatId, {
          lastActivity: new Date(),
        });

        // Get relevant memory and chat history
        const [memory, chatHistory] = await Promise.all([
          queryMemory({
            queryVector: userVector,
            limit: 3,
            filter: {
              user: socket.user._id.toString(),
            },
          }),

          messageModel
            .find({
              chat: chatId,
              user: socket.user._id,
            })
            .sort({ createdAt: -1 })
            .limit(20),
        ]);

        // Convert history to oldest -> newest
        chatHistory.reverse();

        // Convert history to Gemini format
        const history = chatHistory.map((message) => ({
          role: message.role === "model" ? "model" : "user",
          parts: [
            {
              text: message.content,
            },
          ],
        }));

        // Prepare long-term memory
        const memoryText = (memory || [])
          .map((item) => item?.metadata?.text)
          .filter(Boolean)
          .join("\n");

        // System prompt
        const systemPrompt = `
You are an AI assistant.

Use the following relevant long-term memories when useful.

Long-term memories:
${memoryText || "No relevant memories found."}

Instructions:
- Answer the user's latest message clearly.
- Use memories naturally when relevant.
- Do not mention the memory system.
- Do not repeat irrelevant memories.
`;

        // Generate AI response
        console.time("Gemini Response Time");

        const response = await aiService.generateResponse({
          systemPrompt,
          history,
        });

        console.timeEnd("Gemini Response Time");

        if (typeof response !== "string" || !response.trim()) {
          throw new Error("AI returned an empty response");
        }

        // Save AI response
        const responseMessage = await messageModel.create({
          chat: chatId,
          user: socket.user._id,
          content: response,
          role: "model",
        });

        // Generate AI response vector
        const responseVector = await aiService.generateVector(response);

        // Save AI memory
        await createMemory({
          vectors: responseVector,
          messageId: responseMessage._id,
          metadata: {
            chat: chatId.toString(),
            user: socket.user._id.toString(),
            text: response,
            role: "model",
          },
        });

        // Update chat activity
        await chatModel.findByIdAndUpdate(chatId, {
          lastActivity: new Date(),
        });

        // Send response to frontend
        socket.emit("ai-response", {
          content: response,
          chat: chatId,
        });
      } catch (error) {
        console.error("AI MESSAGE ERROR:", error);

        socket.emit("ai-response", {
          error: "AI response generate nahi ho paya",
        });
      }
    });

    // User disconnect
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.user._id.toString(), reason);
    });
  });

  return io;
}

module.exports = initSocketServer;
