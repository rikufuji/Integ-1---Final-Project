const { v4: uuidv4 } = require("uuid");
const { getAllReservations, addReservation, updateReservationStatus, getAllRooms, updateRoom, updateUser, getAllUsers, getAllPayments, addPayment, logActivity } = require("../models/xmlModel");

let _io = null;
function setIO(io) { _io = io; }

function getReservations(req, res) {
  const all = getAllReservations();
  if (req.user.role === "admin") return res.json(all);
  res.json(all.filter((r) => r.tenantId === req.user.id));
}

function submitReservation(req, res) {
  const { roomId, roomNumber, moveInDate, downPayment, method, note, type } = req.body;
  if (!roomId || !moveInDate || !method)
    return res.status(400).json({ error: "roomId, moveInDate, method required" });

  const room = getAllRooms().find((r) => r.id === roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status === "occupied") return res.status(409).json({ error: "Room is no longer available" });

  const isTransfer = type === "transfer";

  // prevent duplicate pending request for same room by same user
  const existing = getAllReservations().find(
    (r) => r.tenantId === req.user.id && r.roomId === roomId && r.status === "pending"
  );
  if (existing) return res.status(409).json({ error: "You already have a pending request for this room." });

  const reservation = {
    id: uuidv4(),
    tenantId: req.user.id,
    tenantName: req.user.fullName,
    roomId,
    roomNumber: String(roomNumber),
    moveInDate,
    downPayment: isTransfer ? "0" : String(downPayment || "0"),
    method,
    note: note || "",
    proofImage: req.file ? req.file.filename : "",
    adminNote: "",
    status: "pending",
    type: isTransfer ? "transfer" : "reservation",
    createdAt: new Date().toISOString(),
  };

  // assign sequential number
  const allResvs = getAllReservations();
  const nums = allResvs.map(r => r.seqNum).filter(n => Number.isInteger(Number(n))).map(Number);
  reservation.seqNum = nums.length ? Math.max(...nums) + 1 : 1;

  addReservation(reservation);
  const action = isTransfer ? `requested transfer to Room ${roomNumber}` : `reserved Room ${roomNumber}`;
  logActivity("reservation", `${req.user.fullName} ${action} (Reservation #${reservation.seqNum})`, `Reservation #${reservation.seqNum}`);
  if (_io) _io.emit("reservation_new", { tenantName: req.user.fullName, roomNumber });
  res.status(201).json(reservation);
}

function approveReservation(req, res) {
  const { id } = req.params;
  const { note } = req.body;
  updateReservationStatus(id, "approved", note || "");

  const resv = getAllReservations().find((r) => r.id === id);
  if (resv) {
    const room = getAllRooms().find((r) => r.id === resv.roomId);
    const user = getAllUsers().find((u) => u.id === resv.tenantId);

    // if transfer, free the old room first
    if (resv.type === "transfer" && user?.roomNumber) {
      const oldRoom = getAllRooms().find((r) => String(r.roomNumber) === String(user.roomNumber));
      if (oldRoom) {
        const remaining = getAllUsers().filter((u) => u.role === "tenant" && String(u.roomNumber) === String(oldRoom.roomNumber) && u.id !== resv.tenantId).length;
        const oldCapacity = Number(oldRoom.capacity) || 1;
        const oldStatus = remaining === 0 ? "available" : (oldCapacity >= 2 && remaining < oldCapacity ? "partial" : "occupied");
        updateRoom(oldRoom.id, { status: oldStatus });
      }
    }

    // assign new room
    updateUser(resv.tenantId, {
      roomNumber: String(resv.roomNumber),
      moveInDate: resv.moveInDate || new Date().toISOString().split("T")[0],
      monthlyRent: room?.monthlyRent || "",
      dueDate: "6",
    });
    const count = getAllUsers().filter((u) => u.role === "tenant" && String(u.roomNumber) === String(resv.roomNumber)).length;
    const capacity = Number(room?.capacity) || 1;
    const newStatus = capacity >= 2 && count < capacity ? "partial" : "occupied";
    updateRoom(resv.roomId, { status: newStatus });
    const action = resv.type === "transfer" ? `Transfer approved — Room ${resv.roomNumber} assigned to ${resv.tenantName}` : `Reservation #${resv.seqNum || resv.id} approved — Room ${resv.roomNumber} assigned to ${resv.tenantName}`;
    logActivity("reservation", action, `Reservation #${resv.seqNum || resv.id}`);

    // create a payment record for the down payment (first month rent)
    const dp = Number(resv.downPayment || 0);
    if (dp > 0) {
      const allPay = getAllPayments();
      const nums = allPay.map(p => p.id).filter(pid => /^p\d+$/.test(pid)).map(pid => parseInt(pid.slice(1))).filter(n => !isNaN(n));
      const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
      const paymentId = "p" + String(nextNum).padStart(3, "0");
      addPayment({
        id: paymentId,
        tenantId: resv.tenantId,
        tenantName: resv.tenantName,
        roomNumber: String(resv.roomNumber),
        amount: String(dp),
        date: new Date().toISOString().split("T")[0],
        method: resv.method || "GCash",
        status: "approved",
        message: "First month rent via reservation down payment",
        denialReason: "",
        proofImage: resv.proofImage || "",
        createdAt: new Date().toISOString(),
      });
      logActivity("payment", `Down payment ₱${dp} from ${resv.tenantName} auto-approved via reservation`, paymentId);
      if (_io) _io.emit("payment_notification", { paymentId, tenantName: resv.tenantName, amount: dp });
    }
    if (_io) _io.emit("reservation_updated", { tenantId: resv.tenantId, status: "approved", roomNumber: resv.roomNumber });
    if (_io) _io.emit("rooms_changed");
  }

  res.json({ message: "Reservation approved" });
}

function declineReservation(req, res) {
  const { id } = req.params;
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: "Reason required" });
  updateReservationStatus(id, "declined", note);
  const resv = getAllReservations().find((r) => r.id === id);
  logActivity("reservation", `Reservation #${resv?.seqNum || id} declined`, `Reservation #${resv?.seqNum || id}`);
  if (_io && resv) _io.emit("reservation_updated", { tenantId: resv.tenantId, status: "declined", roomNumber: resv.roomNumber });
  res.json({ message: "Reservation declined" });
}

module.exports = { getReservations, submitReservation, approveReservation, declineReservation, setIO };
