const chatModel = require("../models/chat.model.js");
const messageModel = require("../models/message.model.js");

async function listChats(req, res) {
  try {
    const chats = await chatModel
      .find({ user: req.user._id })
      .sort({ lastActivity: -1, createdAt: -1 })
      .select("_id title lastActivity createdAt");

    return res.status(200).json({ success: true, chats });
  } catch (error) {
    console.error("LIST CHATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load chats" });
  }
}

async function getChatMessages(req, res) {
  try {
    const chat = await chatModel.findOne({
      _id: req.params.chatId,
      user: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const messages = await messageModel
      .find({ chat: chat._id, user: req.user._id, role: { $in: ["user", "model"] } })
      .sort({ createdAt: 1 })
      .select("_id content role createdAt");

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("GET CHAT MESSAGES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load messages" });
  }
}

async function createChat(req, res) {
  try {
    const { title } = req.body || {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty title is required",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const chat = await chatModel.create({
      user: req.user._id,
      title: title.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Chat created successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
      },
    });
  } catch (error) {
    console.error("CREATE CHAT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create chat",
    });
  }
}

module.exports = { createChat, listChats, getChatMessages };
