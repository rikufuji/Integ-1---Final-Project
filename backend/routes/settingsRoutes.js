const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getSettings, updateSettings } = require("../controllers/settingsController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `paymentQR${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.get("/",  authMiddleware, getSettings);
router.put("/",  authMiddleware, adminOnly, upload.single("gcashQR"), updateSettings);

module.exports = router;
