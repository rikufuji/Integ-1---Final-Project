const fs   = require("fs");
const FILE = require("path").join(__dirname, "../data/settings.json");
const FIELDS = ["gcashName","gcashNumber","gcashQR","bankName","bankAccount","bankHolder","paymentNote"];

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return {};
  }
}

function getSettings(req, res) {
  res.json(readSettings());
}

function updateSettings(req, res) {
  try {
    const current = readSettings();
    FIELDS.filter((k) => k !== "gcashQR").forEach((k) => {
      if (req.body[k] !== undefined) current[k] = req.body[k];
    });
    if (req.file) current.gcashQR = req.file.filename;
    fs.writeFileSync(FILE, JSON.stringify(current, null, 2), "utf-8");
    res.json({ message: "Settings updated", settings: readSettings() });
  } catch (err) {
    console.error("[updateSettings] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings };
