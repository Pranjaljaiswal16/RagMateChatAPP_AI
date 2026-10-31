const chatModel = require("../models/chat.model.js");

async function createChat(req, res) {
  const { title } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      message: "A non-empty title is required",
    });
  }

  try {
    const chat = await chatModel.create({
      user: req.user._id,
      title: title.trim(),
    });

    return res.status(201).json({
      message: "Chat created successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to create chat",
    });
  }
}



module.exports = { createChat }
