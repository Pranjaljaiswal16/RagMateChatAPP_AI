const express = require("express");
const router = express.Router();

const authUserMiddleware = require("../middleware/auth.middleware.js");
const { createChat } = require("../controllers/chat.controller.js");

router.post("/", authUserMiddleware, createChat);

module.exports = router;