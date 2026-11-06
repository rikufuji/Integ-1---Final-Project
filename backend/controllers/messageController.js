const { getAllMessages, addMessage, logActivity } = require("../models/xmlModel");

function getMessages(req, res) {
  const { room = "general" } = req.query;
  res.json(getAllMessages(room));
}

function getDMRooms(req, res) {
  const all = getAllMessages();
  const dmMessages = all.filter((m) => String(m.room).startsWith("dm-"));
  const seen = new Map();
  dmMessages.forEach((m) => { if (!seen.has(m.room)) seen.set(m.room, m); });
  // extract the OTHER participant's ID from room ID (dm-idA_idB)
  const myId = req.user.id;
  const rooms = Array.from(seen.values()).map((m) => {
    const parts = String(m.room).replace("dm-", "").split("_");
    const otherId = parts.find((p) => p !== myId) || parts[0];
    return { room: m.room, otherId };
  }).filter((r) => String(r.room).includes(myId));
  res.json(rooms);
}

function postMessage(req, res) {
  const { content, room = "general" } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });

  const { v4: uuidv4 } = require("uuid");
  const msg = {
    id: uuidv4(),
    room,
    sender: req.user.fullName,
    senderId: req.user.id,
    content,
    timestamp: new Date().toISOString(),
  };

  addMessage(msg);
  logActivity("message", `${req.user.fullName}: ${content}`, room);
  res.status(201).json(msg);
}

module.exports = { getMessages, postMessage, getDMRooms };
