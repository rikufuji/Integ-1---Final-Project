const { v4: uuidv4 } = require("uuid");
const { getAllPayments, addPayment, updatePaymentStatus, getUserById, logActivity } = require("../models/xmlModel");
const { publishPaymentEvent } = require("../lib/rabbitmq");

let _io = null;
function setIO(io) { _io = io; }

function getPayments(req, res) {
  let payments = getAllPayments();
  if (req.user.role === "tenant") {
    payments = payments.filter((p) => String(p.tenantId) === String(req.user.id));
  }
  res.json(payments);
}

function submitPayment(req, res) {
  const { amount, method, message, date } = req.body;
  if (!amount || !method) return res.status(400).json({ error: "amount and method required" });

  const user = getUserById(req.user.id);
  // block unassigned tenants from submitting regular payments
  if (!user?.roomNumber || String(user.roomNumber).trim() === "") {
    return res.status(403).json({ error: "You must be assigned a room before submitting a payment." });
  }
  // generate sequential payment ID: P01, P02, ...
  const payments = getAllPayments();
  const existing = payments.map(p => p.id).filter(id => /^p\d+$/.test(id)).map(id => parseInt(id.slice(1))).filter(n => !isNaN(n));
  const nextNum = existing.length ? Math.max(...existing) + 1 : 1;
  const paymentId = "p" + String(nextNum).padStart(3, "0");

  const payment = {
    id: paymentId,
    tenantId: req.user.id,
    tenantName: req.user.fullName,
    roomNumber: user?.roomNumber || "",
    amount,
    date: date || new Date().toISOString().split("T")[0],
    method,
    status: "pending",
    message: message || "",
    denialReason: "",
    proofImage: req.file ? req.file.filename : "",
    createdAt: new Date().toISOString(),
  };

  addPayment(payment);
  logActivity("payment", `Payment submitted by ${req.user.fullName} — ₱${amount}`, payment.id);
  publishPaymentEvent({ type: "submitted", paymentId: payment.id, tenantName: req.user.fullName, amount });
  res.status(201).json({ message: "Payment submitted", paymentId: payment.id });
}

function approvePayment(req, res) {
  const { id } = req.params;
  const payments = getAllPayments();
  const payment = payments.find((p) => p.id === id);
  updatePaymentStatus(id, "approved");
  logActivity("payment", `Payment ${id} approved by admin`, id);
  publishPaymentEvent({ type: "approved", paymentId: id });
  if (_io && payment) _io.emit("payment_status_updated", { tenantId: payment.tenantId, paymentId: id, status: "approved", amount: payment.amount });
  res.json({ message: "Payment approved" });
}

function denyPayment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Denial reason required" });
  const payments = getAllPayments();
  const payment = payments.find((p) => p.id === id);
  updatePaymentStatus(id, "denied", reason);
  logActivity("payment", `Payment ${id} denied — ${reason}`, id);
  publishPaymentEvent({ type: "denied", paymentId: id, reason });
  if (_io && payment) _io.emit("payment_status_updated", { tenantId: payment.tenantId, paymentId: id, status: "denied", reason });
  res.json({ message: "Payment denied" });
}

module.exports = { getPayments, submitPayment, approvePayment, denyPayment, setIO };
