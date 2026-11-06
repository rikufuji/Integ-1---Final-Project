const { getAllUsers, getUserById, updateUser, logActivity } = require("../models/xmlModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function getProfile(req, res) {
  const user = getUserById(req.user.id) || getAllUsers().find((u) => u.username === req.user.username);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { password: _, ...safe } = user;
  res.json(safe);
}

function updateProfile(req, res) {
  const user = getUserById(req.user.id) || getAllUsers().find((u) => u.username === req.user.username);
  if (!user) return res.status(404).json({ error: "User not found" });
  const allowed = ["fullName", "phone", "birthday", "address", "emergencyContact"];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (req.file) updates.avatar = req.file.filename;
  updateUser(user.id, updates);
  logActivity("profile", `User ${req.user.username} updated profile`, user.id);
  const updated = getUserById(user.id);
  const token = jwt.sign(
    { id: updated.id, username: updated.username, role: updated.role, fullName: updated.fullName },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ message: "Profile updated", avatar: updates.avatar || null, token });
}

function getAllTenants(req, res) {
  const users = getAllUsers().filter((u) => u.role === "tenant");
  res.json(users.map(({ password: _, ...u }) => u));
}

function getAllRegisteredUsers(req, res) {
  const users = getAllUsers().filter((u) => u.role !== "admin");
  res.json(users.map(({ password: _, ...u }) => u));
}

function getTenantById(req, res) {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Tenant not found" });
  const { password: _, ...safe } = user;
  res.json(safe);
}

function updateTenant(req, res) {
  const allowed = ["roomNumber", "monthlyRent", "dueDate", "moveInDate", "accountNumber"];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  updateUser(req.params.id, updates);
  logActivity("admin", `Admin updated tenant ${req.params.id}`, req.params.id);
  res.json({ message: "Tenant updated" });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword required" });
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
  const hashed = await bcrypt.hash(newPassword, 10);
  updateUser(req.user.id, { password: hashed });
  logActivity("profile", `User ${req.user.username} changed password`, req.user.id);
  res.json({ message: "Password changed successfully" });
}

module.exports = { getProfile, updateProfile, changePassword, getAllTenants, getTenantById, updateTenant, getAllRegisteredUsers };
