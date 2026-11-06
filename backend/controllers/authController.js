const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUserByUsername, addUser, getAllUsers, logActivity } = require("../models/xmlModel");

function generateUserId(role) {
  const users = getAllUsers();
  const prefix = role === "admin" ? "admin" : "user";
  const nums = users
    .filter((u) => u.id && u.id.startsWith(prefix))
    .map((u) => parseInt(u.id.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + next;
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  logActivity("auth", `User ${username} logged in`, user.id);

  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
}

async function register(req, res) {
  const { username, password, fullName, phone, birthday, address, emergencyContact } = req.body;
  if (!username || !password || !fullName)
    return res.status(400).json({ error: "username, password, fullName required" });

  if (getUserByUsername(username))
    return res.status(409).json({ error: "Username already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const role = req.body.role === "admin" ? "admin" : "tenant";
  const newUser = {
    id: generateUserId(role),
    username,
    password: hashed,
    role,
    fullName,
    phone: phone || "",
    birthday: birthday || "",
    address: address || "",
    emergencyContact: emergencyContact || "",
    accountNumber: "",
    roomNumber: "",
    monthlyRent: "",
    dueDate: "",
    moveInDate: "",
    createdAt: new Date().toISOString(),
  };

  addUser(newUser);
  logActivity("auth", `New user registered: ${username}`, newUser.id);
  res.status(201).json({ message: "Account created successfully" });
}

module.exports = { login, register };
