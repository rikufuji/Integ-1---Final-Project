const router = require("express").Router();
const { authMiddleware } = require("../middleware/auth");
const { getGroups, createGroup } = require("../controllers/groupController");

router.get("/",  authMiddleware, getGroups);
router.post("/", authMiddleware, createGroup);

module.exports = router;
