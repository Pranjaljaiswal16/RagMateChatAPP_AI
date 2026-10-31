const userModel = require("../models/auth.model.js");
const jwt = require("jsonwebtoken");

async function authUser(req, res, next) {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
}

module.exports = authUser;
