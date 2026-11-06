const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getPayments, submitPayment, approvePayment, denyPayment } = require("../controllers/paymentController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `proof-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.get("/", authMiddleware, getPayments);
router.post("/", authMiddleware, upload.single("proofImage"), submitPayment);
router.put("/:id/approve", authMiddleware, adminOnly, approvePayment);
router.put("/:id/deny", authMiddleware, adminOnly, denyPayment);

module.exports = router;
