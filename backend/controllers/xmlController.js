const { transformToHTML, transformToJSON } = require("../models/xsltModel");
const { getAllLogs, getAllUsers } = require("../models/xmlModel");
const fs = require("fs");
const path = require("path");

const XML_DIR = require("path").join(__dirname, "../data/xml");

// Sync users from JSON → XML for XSLT reports. Payments/reservations/messages/logs are already in XML.
function syncXML() {
  const users = getAllUsers();
  const usersXml = `<?xml version="1.0" encoding="UTF-8"?>
<users>
${users.map((u) => `  <user>
    <id>${u.id||""}</id>
    <username>${u.username||""}</username>
    <password>********</password>
    <role>${u.role||""}</role>
    <fullName>${u.fullName||""}</fullName>
    <phone>${u.phone||""}</phone>
    <birthday>${u.birthday||""}</birthday>
    <address>${u.address||""}</address>
    <emergencyContact>${u.emergencyContact||""}</emergencyContact>
    <accountNumber>${u.accountNumber||""}</accountNumber>
    <roomNumber>${u.roomNumber||""}</roomNumber>
    <monthlyRent>${u.monthlyRent||""}</monthlyRent>
    <dueDate>${u.dueDate||""}</dueDate>
    <moveInDate>${u.moveInDate||""}</moveInDate>
    <createdAt>${u.createdAt||""}</createdAt>
  </user>`).join("\n")}
</users>`;
  fs.writeFileSync(path.join(XML_DIR, "users.xml"), usersXml, "utf-8");
}

async function getPaymentsHTML(req, res) {
  try {
    syncXML();
    const html = await transformToHTML("payments.xml", "payments-to-html.xslt");
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getUsersHTML(req, res) {
  try {
    syncXML();
    const html = await transformToHTML("users.xml", "users-to-html.xslt");
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getPaymentsJSON(req, res) {
  try {
    syncXML();
    const json = await transformToJSON("payments.xml");
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getUsersJSON(req, res) {
  try {
    syncXML();
    const json = await transformToJSON("users.xml");
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function getLogs(req, res) {
  res.json(getAllLogs());
}

module.exports = { getPaymentsHTML, getUsersHTML, getPaymentsJSON, getUsersJSON, getLogs };
