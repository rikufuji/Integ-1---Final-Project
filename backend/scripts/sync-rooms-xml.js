const fs = require("fs");
const path = require("path");

const rooms = JSON.parse(fs.readFileSync("C:\\BoardEaseData\\json\\rooms.json", "utf-8"));
const out = path.join(__dirname, "..", "xml", "rooms.xml");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<rooms>"];

for (const r of rooms) {
  lines.push("  <room>");
  lines.push(`    <id>${esc(r.id)}</id>`);
  lines.push(`    <roomNumber>${esc(r.roomNumber)}</roomNumber>`);
  lines.push(`    <type>${esc(r.type)}</type>`);
  lines.push(`    <monthlyRent>${esc(r.monthlyRent)}</monthlyRent>`);
  lines.push(`    <capacity>${esc(r.capacity)}</capacity>`);
  lines.push(`    <status>${esc(r.status)}</status>`);
  lines.push(`    <description>${esc(r.description)}</description>`);
  if (r.images) lines.push(`    <images>${esc(r.images)}</images>`);
  lines.push("  </room>");
}

lines.push("</rooms>");
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log("Wrote", out);
