const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getReservations, submitReservation, approveReservation, declineReservation } = require("../controllers/reservationController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `resv-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.get("/",                authMiddleware,            getReservations);
router.post("/",               authMiddleware,            upload.single("proofImage"), submitReservation);
router.put("/:id/approve",     authMiddleware, adminOnly, approveReservation);
router.put("/:id/decline",     authMiddleware, adminOnly, declineReservation);

module.exports = router;
