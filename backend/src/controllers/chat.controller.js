const chatModel = require("../models/chat.model.js");

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

module.exports = { createChat };
