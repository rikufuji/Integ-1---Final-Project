const router   = require("express").Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getRooms, createRoom, editRoom, assignTenant, unassignTenant, getRoomStats } = require("../controllers/roomController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `room-${Date.now()}-${Math.random().toString(36).slice(2,7)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.get("/stats",         getRoomStats);
router.get("/",              authMiddleware, getRooms);
router.post("/",             authMiddleware, adminOnly, upload.array("images", 5), createRoom);
router.put("/:id",           authMiddleware, adminOnly, upload.array("images", 5), editRoom);
router.post("/:id/assign",   authMiddleware, adminOnly, assignTenant);
router.post("/:id/unassign", authMiddleware, adminOnly, unassignTenant);

module.exports = router;
