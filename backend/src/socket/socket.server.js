const { parse } = require("cookie");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const userModel = require("../models/auth.model.js");
const messageModel = require("../models/message.model.js");
const chatModel = require("../models/chat.model.js");

const { createMemory, queryMemory } = require("../services/vector.service.js");

const aiService = require("../services/ai.service.js");

// =====================================================
// INIT SOCKET SERVER
// =====================================================

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, "http://localhost:5173"].filter(
        Boolean,
      ),
      credentials: true,
    },
  });

  // =====================================================
  // SOCKET AUTHENTICATION (MIDDLEWARE)
  // =====================================================

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || "";

      const cookies = parse(cookieHeader);

      if (!cookies.token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

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

  // =====================================================
  // CONNECTION
  // =====================================================

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user._id.toString());

    // ===================================================
    // AI MESSAGE
    // ===================================================

    socket.on("ai-message", async (messagePayload) => {
      try {
        // -----------------------------------------------
        // 1. Validate Message
        // -----------------------------------------------

        const chatId = messagePayload?.chat;
        const content = messagePayload?.content?.trim();

        if (!chatId || !content) {
          return socket.emit("ai-response", {
            error: "Invalid message payload",
          });
        }

        // -----------------------------------------------
        // 2. Verify Chat Ownership
        // -----------------------------------------------

        const chat = await chatModel.findOne({
          _id: chatId,
          user: socket.user._id,
        });

        if (!chat) {
          return socket.emit("ai-response", {
            error: "Unauthorized chat",
          });
        }

        // -----------------------------------------------

        // 3. Create User Vector
        // 4. Save User Message
        // -----------------------------------------------

        const [userMessage, userVector] = await Promise.all([
          messageModel.create({
            chat: chatId,
            user: socket.user._id,
            content,
            role: "user",
          }),

          aiService.generateVector(content),
        ]);

        // -----------------------------------------------
        // 4 Save User Memory (pinecone db)  user jo question pucha ho db mei save kiye
        // -----------------------------------------------

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

        // -----------------------------------------------
        // 6. Query Memory + Chat History
        // -----------------------------------------------

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
            })
            .sort({
              createdAt: -1,
            })
            .limit(20),
        ]);

        // Newest → Oldest
        // Convert to Oldest → Newest

        chatHistory.reverse();

        // -----------------------------------------------
        // 7. Convert History to Gemini Format
        // -----------------------------------------------

        const history = chatHistory.map((message) => ({
          role: message.role === "model" ? "model" : "user",
          parts: [
            {
              text: message.content,
            },
          ],
        }));

        // -----------------------------------------------
        // 8. Prepare Long-Term Memory
        // -----------------------------------------------

        const memoryText = memory
          .map((item) => item?.metadata?.text)
          .filter(Boolean)
          .join("\n");

        // -----------------------------------------------
        // 9. System Prompt
        // -----------------------------------------------

        const systemPrompt = `You are an AI assistant.use the following relevant long-term memories when they are useful.
        Long-term memories:${memoryText || "No relevant memories found."}
        Instructions:
      - Answer the user's latest message clearly.
      - Use memories naturally when relevant.
      - Do not mention the memory system.
      - Do not repeat irrelevant memories.
        `;

        // -----------------------------------------------
        // 10. Generate AI Response
        // -----------------------------------------------

        console.time("Gemini Response Time");

        const response = await aiService.generateResponse({
          systemPrompt,
          history,
        });

        console.timeEnd("Gemini Response Time");

        // -----------------------------------------------
        // 11. Save AI Response
        // +
        // 12. Generate AI Vector
        // -----------------------------------------------

        const [responseMessage, responseVector] = await Promise.all([
          messageModel.create({
            chat: chatId,
            content: response,
            role: "model",
          }),

          aiService.generateVector(response),
        ]);

        // -----------------------------------------------
        // 13. Save AI Memory
        // -----------------------------------------------

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

        // -----------------------------------------------
        // 14. Send Response to Frontend
        // -----------------------------------------------

        socket.emit("ai-response", {
          content: response,
          chat: chatId,
        });
      } catch (error) {
        console.error("AI ERROR:", error);

        socket.emit("ai-response", {
          error: "AI response generate nahi ho paya",
        });
      }
    });

    // ===================================================
    // DISCONNECT
    // ===================================================

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user._id.toString());
    });
  });

  return io;
}

module.exports = initSocketServer;
