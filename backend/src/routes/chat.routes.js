const express = require("express");
const authUserMiddleware = require("../middleware/auth.middleware.js");
const { createChat } = require("../controllers/chat.controller.js");

const router = express.Router();

router.post("/", authUserMiddleware, createChat);

module.exports = router;
