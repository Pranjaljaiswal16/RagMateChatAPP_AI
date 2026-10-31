const express = require("express");
const router = express.Router();

const authUserMiddleware = require("../middleware/auth.middleware.js");
const {
  createChat,
  listChats,
  getChatMessages,
} = require("../controllers/chat.controller.js");

router.get("/", authUserMiddleware, listChats);
router.get("/:chatId/messages", authUserMiddleware, getChatMessages);
router.post("/", authUserMiddleware, createChat);

module.exports = router;
