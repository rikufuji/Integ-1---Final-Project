require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Ensure uploads and xml folders always exist (important on fresh clone)
const UPLOADS_DIR = require("path").join(__dirname, "uploads");
// Data directories are now inside the project under backend/data/
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const roomRoutes    = require("./routes/roomRoutes");
const xmlRoutes     = require("./routes/xmlRoutes");
const groupRoutes        = require("./routes/groupRoutes");
const reservationRoutes  = require("./routes/reservationRoutes");
const settingsRoutes     = require("./routes/settingsRoutes");
const { logActivity, addMessage } = require("./models/xmlModel");
const { v4: uuidv4 } = require("uuid");
const { initKafka, publishMessage } = require("./lib/kafka");
const { initRabbitMQ } = require("./lib/rabbitmq");
const { setIO: setRoomIO }        = require("./controllers/roomController");
const { setIO: setReservationIO } = require("./controllers/reservationController");
const { setIO: setPaymentIO }     = require("./controllers/paymentController");

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── Brokers ─────────────────────────────────────────────────────────────────
initKafka(io);
initRabbitMQ(io);
setRoomIO(io);
setReservationIO(io);
setPaymentIO(io);

// ─── Socket.IO Events ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`[Socket.IO] ${socket.id} joined room: ${room}`);
  });

  socket.on("send_message", async (data) => {
    const message = { ...data, id: data.id || uuidv4(), timestamp: new Date().toISOString() };
    io.to(data.room).emit("receive_message", message);
    publishMessage(message);
    addMessage(message);
    const logContent = data.imageData ? `${data.sender}: [image]` : `${data.sender}: ${data.content}`;
    await logActivity("message", logContent, data.room);
  });

  socket.on("room_updated", () => {
    io.emit("rooms_changed");
  });

  socket.on("notification", async (data) => {
    io.emit("receive_notification", data);
    await logActivity("notification", data.message, data.userId);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_DIR));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/rooms",    roomRoutes);
app.use("/api/groups",        groupRoutes);
app.use("/api/reservations",  reservationRoutes);
app.use("/api/settings",      settingsRoutes);
app.use("/api/xml",           xmlRoutes);

app.get("/", (req, res) => res.json({ message: "BoardEase API running" }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[BoardEase] Server running on http://localhost:${PORT}`);
});

module.exports = { io };
