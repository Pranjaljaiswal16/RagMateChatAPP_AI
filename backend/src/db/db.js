const mongoose = require("mongoose");

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);

    // Stop startup if database connection fails
    throw error;
  }
}

module.exports = connectDB;