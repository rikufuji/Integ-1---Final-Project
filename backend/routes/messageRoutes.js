const router = require("express").Router();
const { authMiddleware } = require("../middleware/auth");
const { getMessages, postMessage, getDMRooms } = require("../controllers/messageController");

router.get("/dms", authMiddleware, getDMRooms);
router.get("/", authMiddleware, getMessages);
router.post("/", authMiddleware, postMessage);

module.exports = router;
