
require("dotenv").config();

const app = require("./src/app.js");
const connectDB = require("./src/db/db.js");
const initSocketServer = require("./src/socket/socket.server.js");

const httpServer = require("http").createServer(app);

initSocketServer(httpServer);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
