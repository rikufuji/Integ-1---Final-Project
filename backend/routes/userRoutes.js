const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getProfile, updateProfile, changePassword, getAllTenants, getTenantById, updateTenant, getAllRegisteredUsers } = require("../controllers/userController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, upload.single("avatar"), updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.get("/admin-id", authMiddleware, (req, res) => {
  const { getAllUsers } = require("../models/xmlModel");
  const admin = getAllUsers().find((u) => u.role === "admin");
  res.json({ id: admin?.id || "admin1" });
});
router.get("/all", authMiddleware, getAllRegisteredUsers);
router.get("/tenants", authMiddleware, getAllTenants);
router.get("/tenants/:id", authMiddleware, adminOnly, getTenantById);
router.put("/tenants/:id", authMiddleware, adminOnly, updateTenant);

module.exports = router;
