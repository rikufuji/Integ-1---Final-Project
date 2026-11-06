const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs   = require("fs");
const { getAllRooms, updateRoom, addRoom, getAllUsers, updateUser, logActivity } = require("../models/xmlModel");

let _io = null;
function setIO(io) { _io = io; }
function broadcast() { if (_io) _io.emit("rooms_changed"); }

function getRoomStats(req, res) {
  const rooms = getAllRooms();
  const tenants = getAllUsers().filter((u) => u.role === "tenant");
  const total = rooms.length;
  const available = rooms.filter((r) => {
    const capacity = Number(r.capacity) || 1;
    const count = tenants.filter((t) => String(t.roomNumber) === String(r.roomNumber)).length;
    return count < capacity;
  }).length;
  const rents = rooms.map((r) => Number(r.monthlyRent) || 0).filter(Boolean);
  const minRent = rents.length ? Math.min(...rents) : 1200;
  res.json({ total, available, minRent });
}

function getRooms(req, res) {
  const rooms = getAllRooms();
  const tenants = getAllUsers().filter((u) => u.role === "tenant");
  const enriched = rooms.map((r) => {
    const roomTenants = tenants.filter((t) => String(t.roomNumber) === String(r.roomNumber));
    const capacity = Number(r.capacity) || 1;
    let status = r.status;
    // auto-derive status for shared rooms based on tenant count
    if (capacity >= 2) {
      if (roomTenants.length === 0) status = "available";
      else if (roomTenants.length < capacity) status = "partial";
      else status = "occupied";
    } else {
      if (roomTenants.length === 0) status = "available";
      else status = "occupied";
    }
    return {
      ...r,
      status,
      images: r.images ? r.images.split(",").filter(Boolean) : (r.image ? [r.image] : []),
      image: r.images ? r.images.split(",").filter(Boolean)[0] || "" : (r.image || ""),
      tenants: roomTenants,
      tenant: roomTenants[0] || null,
    };
  });
  res.json(enriched);
}

function createRoom(req, res) {
  const { roomNumber, type, monthlyRent, capacity, description } = req.body;
  if (!roomNumber || !type || !monthlyRent) return res.status(400).json({ error: "roomNumber, type, monthlyRent required" });
  const exists = getAllRooms().find((r) => String(r.roomNumber) === String(roomNumber));
  if (exists) return res.status(409).json({ error: "Room number already exists" });
  const images = req.files && req.files.length ? req.files.map((f) => f.filename).join(",") : "";
  const room = { id: `r${roomNumber}`, roomNumber: String(roomNumber), type, monthlyRent: String(monthlyRent), capacity: String(capacity || 1), status: "available", description: description || "", images };
  addRoom(room);
  logActivity("admin", `Room ${roomNumber} created`, room.id);
  broadcast();
  res.status(201).json(room);
}

function editRoom(req, res) {
  const { id } = req.params;
  const allowed = ["type", "monthlyRent", "capacity", "status", "description"];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (req.files && req.files.length) {
    updates.images = req.files.map((f) => f.filename).join(",");
  }
  updateRoom(id, updates);
  logActivity("admin", `Room ${id} updated`, id);
  broadcast();
  res.json({ message: "Room updated" });
}

function assignTenant(req, res) {
  const { id } = req.params;
  const { tenantId, monthlyRent, dueDate, moveInDate } = req.body;
  if (!tenantId) return res.status(400).json({ error: "tenantId required" });
  const room = getAllRooms().find((r) => r.id === id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  updateUser(tenantId, { roomNumber: String(room.roomNumber), monthlyRent: String(monthlyRent || room.monthlyRent), dueDate: String(dueDate || "6"), moveInDate: moveInDate || new Date().toISOString().split("T")[0] });
  // count tenants now in this room after assignment
  const count = getAllUsers().filter((u) => u.role === "tenant" && String(u.roomNumber) === String(room.roomNumber)).length;
  const capacity = Number(room.capacity) || 1;
  const newStatus = capacity >= 2 && count < capacity ? "partial" : "occupied";
  updateRoom(id, { status: newStatus });
  logActivity("admin", `Tenant ${tenantId} assigned to room ${room.roomNumber}`, id);
  broadcast();
  res.json({ message: "Tenant assigned" });
}

function unassignTenant(req, res) {
  const { id } = req.params;
  const room = getAllRooms().find((r) => r.id === id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const tenant = getAllUsers().find((u) => String(u.roomNumber) === String(room.roomNumber) && u.role === "tenant");
  if (tenant) updateUser(tenant.id, { roomNumber: "", monthlyRent: "", dueDate: "", moveInDate: "" });
  // count remaining tenants after unassignment
  const remaining = getAllUsers().filter((u) => u.role === "tenant" && String(u.roomNumber) === String(room.roomNumber) && u.id !== tenant?.id).length;
  const capacity = Number(room.capacity) || 1;
  const newStatus = remaining === 0 ? "available" : (capacity >= 2 && remaining < capacity ? "partial" : "occupied");
  updateRoom(id, { status: newStatus });
  logActivity("admin", `Room ${room.roomNumber} unassigned`, id);
  broadcast();
  res.json({ message: "Room unassigned" });
}

module.exports = { getRooms, getRoomStats, createRoom, editRoom, assignTenant, unassignTenant, setIO };
