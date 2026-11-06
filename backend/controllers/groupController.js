const { v4: uuidv4 } = require("uuid");
const { getAllGroups, addGroup, getAllUsers, logActivity } = require("../models/xmlModel");

function getGroups(req, res) {
  const groups = getAllGroups();
  // return only groups the user is a member of (or all for admin)
  const visible = req.user.role === "admin"
    ? groups
    : groups.filter((g) => g.members.includes(req.user.id));
  res.json(visible);
}

function createGroup(req, res) {
  const { name, memberIds } = req.body;
  if (!name || !memberIds || !memberIds.length) {
    return res.status(400).json({ error: "name and memberIds required" });
  }
  // always include creator
  const members = [...new Set([req.user.id, ...memberIds])];
  const group = {
    id: uuidv4(),
    name,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    members,
  };
  addGroup(group);
  logActivity("group", `Group "${name}" created by ${req.user.fullName}`, group.id);
  res.status(201).json(group);
}

module.exports = { getGroups, createGroup };
