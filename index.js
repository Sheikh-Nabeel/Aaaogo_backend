import "dotenv/config";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/connectDB.js";
import mongoose from "mongoose";
import "./models/index.js";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
import { handleBookingEvents } from "./utils/socketHandlers.js";
import userModel from "./models/userModel.js";
import queryOptimizer from "./utils/queryOptimizer.js";
import { initRoutes } from "./routes/index.js";
import { initMiddlewares } from "./middlewares/index.js";
import { allowedOrigins } from "./config/config.js";
import "colors";

cloudinary.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.API_Key,
  api_secret: process.env.API_Secret,
});
cloudinary.v2.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.API_Key,
  api_secret: process.env.API_Secret,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  },
});

initMiddlewares(app);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

initRoutes(app);

// Initialize server function
const initializeServer = async () => {
  try {
    await connectDB();

    // Sync indexes on startup (safe in dev/staging; consider off-peak for prod)
    try {
      const modelNames = mongoose.modelNames();
      await Promise.all(modelNames.map((name) => mongoose.model(name).syncIndexes()));
      console.log(`Synchronized indexes for ${modelNames.length} models`.green);
    } catch (syncErr) {
      console.warn(`Index sync warning: ${syncErr.message}`.yellow);
    }

    // Generate performance report every 30 minutes
    // !! move this to cron job
    setInterval(() => {
      const report = queryOptimizer.generatePerformanceReport();
      console.log("📊 Performance Report:".cyan, report);
    }, 30 * 60 * 1000);

    // Socket.IO authentication middleware (token via query or auth)
    io.use(async (socket, next) => {
      try {
        const token = (socket.handshake.query && socket.handshake.query.token) || (socket.handshake.auth && socket.handshake.auth.token);

        if (!token) {
          console.log("Socket connection rejected: No token provided".red);
          return next(new Error("Authentication error: No token provided"));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user in database
        const user = await userModel.findById(decoded.id).select("-password");

        if (!user) {
          console.log("Socket connection rejected: User not found".red);
          return next(new Error("Authentication error: User not found"));
        }

        // Attach user to socket
        socket.user = user;
        console.log(`Socket authenticated for user: ${user.email}`.green);

        next();
      } catch (error) {
        console.log(`Socket authentication failed: ${error.message}`.red);
        next(new Error("Authentication error: Invalid token"));
      }
    });

    // Socket.IO connection handling (delegate events to handlers)
    io.on("connection", (socket) => {
      console.log(
        `Authenticated user connected: ${socket.id} - ${socket.user.email}`
          .green
      );

      handleBookingEvents(socket, io);

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(
          `Authenticated user disconnected: ${socket.id} - ${socket.user.email}`
            .red
        );
      });
    });

    // Make io accessible to other modules
    app.set("io", io);

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () =>
      console.log(`🚀 Server started successfully on port: ${PORT}`.cyan.bold)
    );
  } catch (error) {
    console.error("Failed to initialize server:", error.message.red);
    process.exit(1);
  }
};

// Initialize the server
initializeServer();

// Export io for use in other modules
export { io };
