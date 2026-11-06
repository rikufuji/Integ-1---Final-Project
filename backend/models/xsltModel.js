/**
 * xsltModel.js
 * Applies XSLT transformations to XML data files.
 * Transforms XML → HTML and XML → JSON using xslt4node.
 */
const path = require("path");
const fs = require("fs");

const XML_DIR = require("path").join(__dirname, "../data/xml");
const XSLT_DIR = path.join(__dirname, "../xslt");

let xslt4node;
try {
  xslt4node = require("xslt4node");
} catch {
  xslt4node = null;
}

/**
 * Fallback: manual XML→JSON using xmldom (no native XSLT engine needed)
 */
const { DOMParser } = require("xmldom");

function xmlFileToJson(xmlFile) {
  const raw = fs.readFileSync(path.join(XML_DIR, xmlFile), "utf-8");
  const doc = new DOMParser().parseFromString(raw, "text/xml");
  const rootName = doc.documentElement.nodeName;
  const childTag = rootName === "payments" ? "payment"
    : rootName === "users" ? "user"
    : rootName === "messages" ? "message"
    : "entry";

  const nodes = doc.getElementsByTagName(childTag);
  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const obj = {};
    for (let j = 0; j < nodes[i].childNodes.length; j++) {
      const c = nodes[i].childNodes[j];
      if (c.nodeType === 1) {
        obj[c.nodeName] = c.childNodes[0] ? c.childNodes[0].nodeValue : "";
      }
    }
    result.push(obj);
  }
  return { [rootName]: result };
}

/**
 * Transform XML file to HTML using XSLT stylesheet.
 * Falls back to a simple HTML table if xslt4node is unavailable.
 */
async function transformToHTML(xmlFile, xsltFile) {
  const xmlPath = path.join(XML_DIR, xmlFile);
  const xsltPath = path.join(XSLT_DIR, xsltFile);

  if (xslt4node) {
    return new Promise((resolve, reject) => {
      xslt4node.transform(
        { source: xmlPath, xsltPath, result: "string" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });
  }

  // Fallback: build HTML from JSON
  const data = xmlFileToJson(xmlFile);
  const rootKey = Object.keys(data)[0];
  const items = data[rootKey];
  if (!items.length) return "<p>No data found.</p>";

  const headers = Object.keys(items[0]);
  const rows = items.map(
    (item) =>
      `<tr>${headers.map((h) => `<td>${item[h] || ""}</td>`).join("")}</tr>`
  );

  return `<!DOCTYPE html><html><head><title>BoardEase Report</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;background:#f0f4ff;padding:20px}
    h2{color:#3b4fa8}
    table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)}
    th{background:#3b4fa8;color:#fff;padding:12px 16px;text-align:left;font-size:13px}
    td{padding:12px 16px;border-bottom:1px solid #e8ecf8;font-size:14px}
    tr:hover td{background:#f5f7ff}
  </style></head><body>
  <h2>BoardEase — ${rootKey.charAt(0).toUpperCase() + rootKey.slice(1)} Report</h2>
  <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.join("")}</tbody></table></body></html>`;
}

/**
 * Transform XML file to JSON using XSLT or DOM fallback.
 */
async function transformToJSON(xmlFile) {
  return xmlFileToJson(xmlFile);
}

module.exports = { transformToHTML, transformToJSON };
