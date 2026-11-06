const router = require("express").Router();
const { spawn } = require("child_process");
const path = require("path");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getPaymentsHTML, getUsersHTML, getPaymentsJSON, getUsersJSON, getLogs } = require("../controllers/xmlController");

// XSLT: XML → HTML
router.get("/payments/html", authMiddleware, adminOnly, getPaymentsHTML);
router.get("/users/html",    authMiddleware, adminOnly, getUsersHTML);

// XSLT: XML → JSON
router.get("/payments/json", authMiddleware, getPaymentsJSON);
router.get("/users/json",    authMiddleware, adminOnly, getUsersJSON);

// Activity logs
router.get("/logs", authMiddleware, adminOnly, getLogs);

// Run PowerShell scripts
router.post("/scripts/run", authMiddleware, adminOnly, (req, res) => {
  const { action } = req.body;
  const allowed = ["all", "backup", "validate", "rotate-logs", "report"];
  if (!allowed.includes(action)) return res.status(400).json({ error: "Invalid action" });

  const scriptPath = path.join(__dirname, "../scripts/xml-automation.ps1");
  const proc = spawn("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Action", action], { timeout: 30000 });

  let output = "", errors = "";
  proc.stdout.on("data", (d) => { output += d.toString(); });
  proc.stderr.on("data", (d) => { errors += d.toString(); });
  proc.on("close", (code) => {
    res.json({ success: code === 0, output: output.trim(), errors: errors.trim(), code });
  });
  proc.on("error", () => res.json({ success: false, output: "", errors: "PowerShell not available", code: -1 }));
});

module.exports = router;
