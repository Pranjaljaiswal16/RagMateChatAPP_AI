const userModel = require("../models/auth.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function registerUser(req, res) {
  try {
    const {
      fullName = {},
      email,
      password,
    } = req.body;
    const { firstName, lastName } = fullName;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "firstName, lastName, email and password are required",
      });
    }

    const isUserAlreadyExist = await userModel.findOne({
      email,
    });

    if (isUserAlreadyExist) {
      return res.status(400).json({
        message: "User already exist",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      fullName: {
        firstName,
        lastName,
      },
      email,
      password: hashPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

    return res.status(201).json({
      message: "Successfully User Register",
      user: {
        email: user.email,
        _id: user._id,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Unable to register user" });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

    return res.status(200).json({
      message: "User logged in successfully",
      user: {
        email: user.email,
        _id: user._id,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Unable to log in" });
  }
}

module.exports = { registerUser, loginUser };
