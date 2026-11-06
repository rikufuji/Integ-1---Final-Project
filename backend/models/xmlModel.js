const fs   = require("fs");
const path = require("path");
const { DOMParser, XMLSerializer } = require("xmldom");

const JSON_DIR = path.join(__dirname, "../data/json");
const XML_DIR  = path.join(__dirname, "../data/xml");

// ── XML helpers ───────────────────────────────────────────────────────────────

function readXML(file) {
  try {
    const raw = fs.readFileSync(path.join(XML_DIR, file), "utf-8");
    return new DOMParser().parseFromString(raw, "text/xml");
  } catch {
    return null;
  }
}

function writeXML(file, doc) {
  fs.writeFileSync(path.join(XML_DIR, file), new XMLSerializer().serializeToString(doc), "utf-8");
}

function ensureXML(file, rootTag) {
  const p = path.join(XML_DIR, file);
  if (!fs.existsSync(p))
    fs.writeFileSync(p, `<?xml version="1.0" encoding="UTF-8"?><${rootTag}></${rootTag}>`, "utf-8");
}

function parseNodes(doc, rootTag, childTag) {
  if (!doc) return [];
  const root = doc.getElementsByTagName(rootTag)[0];
  if (!root) return [];
  const nodes = root.getElementsByTagName(childTag);
  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const obj = {};
    for (let j = 0; j < nodes[i].childNodes.length; j++) {
      const c = nodes[i].childNodes[j];
      if (c.nodeType === 1) {
        let val = "";
        for (let k = 0; k < c.childNodes.length; k++) val += c.childNodes[k].nodeValue || "";
        obj[c.nodeName] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

// fields that need CDATA (special chars like $ / &)
const CDATA_FIELDS = new Set(["content", "detail", "message", "note", "adminNote", "denialReason", "description"]);

function buildElement(doc, tag, fields) {
  const el = doc.createElement(tag);
  Object.entries(fields).forEach(([k, v]) => {
    const child = doc.createElement(k);
    const val = Array.isArray(v) ? v.join(",") : (v === null || v === undefined ? "" : String(v));
    if (CDATA_FIELDS.has(k) && val) child.appendChild(doc.createCDATASection(val));
    else child.appendChild(doc.createTextNode(val));
    el.appendChild(child);
  });
  return el;
}

function updateNodeById(doc, childTag, id, updates) {
  const nodes = doc.getElementsByTagName(childTag);
  for (let i = 0; i < nodes.length; i++) {
    const idEl = nodes[i].getElementsByTagName("id")[0];
    if (idEl && (idEl.childNodes[0]?.nodeValue || "") === id) {
      Object.entries(updates).forEach(([k, v]) => {
        let el = nodes[i].getElementsByTagName(k)[0];
        if (!el) { el = doc.createElement(k); nodes[i].appendChild(el); }
        while (el.firstChild) el.removeChild(el.firstChild);
        const val = Array.isArray(v) ? v.join(",") : (v === null || v === undefined ? "" : String(v));
        if (CDATA_FIELDS.has(k) && val) el.appendChild(doc.createCDATASection(val));
        else el.appendChild(doc.createTextNode(val));
      });
      return true;
    }
  }
  return false;
}

// ── JSON fallback (rooms, groups still use JSON) ──────────────────────────────

function read(name) {
  try { return JSON.parse(fs.readFileSync(path.join(JSON_DIR, name + ".json"), "utf-8")); }
  catch { return []; }
}

function write(name, data) {
  fs.writeFileSync(path.join(JSON_DIR, name + ".json"), JSON.stringify(data, null, 2), "utf-8");
}

// ── Users (JSON) ─────────────────────────────────────────────────────────────

function getAllUsers() { return read("users"); }
function getUserByUsername(username) { return getAllUsers().find((u) => u.username === username) || null; }
function getUserById(id) { return getAllUsers().find((u) => u.id === id) || null; }

function addUser(user) {
  const users = read("users");
  users.push(user);
  write("users", users);
}

function updateUser(id, updates) {
  const users = read("users");
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...updates };
  write("users", users);
}

// ── Rooms (JSON) ──────────────────────────────────────────────────────────────

function getAllRooms() { return read("rooms"); }
function addRoom(room) { const r = read("rooms"); r.push(room); write("rooms", r); }
function updateRoom(id, updates) {
  const rooms = read("rooms");
  const idx = rooms.findIndex((r) => r.id === id);
  if (idx === -1) return;
  rooms[idx] = { ...rooms[idx], ...updates };
  write("rooms", rooms);
}

// ── Payments ──────────────────────────────────────────────────────────────────

function getAllPayments() {
  ensureXML("payments.xml", "payments");
  return parseNodes(readXML("payments.xml"), "payments", "payment");
}

function addPayment(payment) {
  ensureXML("payments.xml", "payments");
  const doc = readXML("payments.xml");
  doc.getElementsByTagName("payments")[0].appendChild(buildElement(doc, "payment", payment));
  writeXML("payments.xml", doc);
}

function updatePaymentStatus(id, status, reason = "") {
  ensureXML("payments.xml", "payments");
  const doc = readXML("payments.xml");
  updateNodeById(doc, "payment", id, { status, denialReason: reason });
  writeXML("payments.xml", doc);
}

// ── Messages ──────────────────────────────────────────────────────────────────

function getAllMessages(room) {
  ensureXML("messages.xml", "messages");
  const msgs = parseNodes(readXML("messages.xml"), "messages", "message");
  return room ? msgs.filter((m) => m.room === room) : msgs;
}

function addMessage(message) {
  ensureXML("messages.xml", "messages");
  const doc = readXML("messages.xml");
  doc.getElementsByTagName("messages")[0].appendChild(buildElement(doc, "message", message));
  writeXML("messages.xml", doc);
}

// ── Logs ──────────────────────────────────────────────────────────────────────

function logActivity(type, detail, ref = "") {
  try {
    ensureXML("logs.xml", "logs");
    const doc = readXML("logs.xml");
    const log = doc.createElement("log");
    [["timestamp", new Date().toISOString()], ["type", type], ["detail", detail], ["ref", ref]].forEach(([k, v]) => {
      const el = doc.createElement(k);
      if (CDATA_FIELDS.has(k) && v) el.appendChild(doc.createCDATASection(String(v)));
      else el.appendChild(doc.createTextNode(String(v)));
      log.appendChild(el);
    });
    doc.getElementsByTagName("logs")[0].appendChild(log);
    writeXML("logs.xml", doc);
  } catch (e) {
    console.error("[xmlModel] logActivity error:", e.message);
  }
}

function getAllLogs() {
  ensureXML("logs.xml", "logs");
  return parseNodes(readXML("logs.xml"), "logs", "log");
}

// ── Reservations ──────────────────────────────────────────────────────────────

function getAllReservations() {
  ensureXML("reservations.xml", "reservations");
  return parseNodes(readXML("reservations.xml"), "reservations", "reservation");
}

function addReservation(reservation) {
  ensureXML("reservations.xml", "reservations");
  const doc = readXML("reservations.xml");
  doc.getElementsByTagName("reservations")[0].appendChild(buildElement(doc, "reservation", reservation));
  writeXML("reservations.xml", doc);
}

function updateReservationStatus(id, status, note = "") {
  ensureXML("reservations.xml", "reservations");
  const doc = readXML("reservations.xml");
  updateNodeById(doc, "reservation", id, { status, adminNote: note });
  writeXML("reservations.xml", doc);
}

// ── Groups (JSON) ─────────────────────────────────────────────────────────────

function getAllGroups() {
  return read("groups").map((g) => ({
    ...g,
    members: Array.isArray(g.members) ? g.members : (g.members ? g.members.split(",").filter(Boolean) : []),
  }));
}

function addGroup(group) {
  const groups = read("groups");
  groups.push({ ...group, members: Array.isArray(group.members) ? group.members : [] });
  write("groups", groups);
}

module.exports = {
  getAllUsers, getUserByUsername, getUserById, addUser, updateUser,
  getAllPayments, addPayment, updatePaymentStatus,
  getAllMessages, addMessage,
  getAllRooms, updateRoom, addRoom,
  getAllReservations, addReservation, updateReservationStatus,
  getAllGroups, addGroup,
  logActivity, getAllLogs,
};
