/**
 * Copies room1–room4.jpg from backend/assets/room-images into uploads
 * and assigns them to all rooms by type (Single → room1/room3, Shared → room2/room4).
 *
 * Usage: npm run seed:room-images
 */
const fs = require("fs");
const path = require("path");

const SEED_DIR = path.join(__dirname, "..", "assets", "room-images");
const UPLOADS_DIR = "C:\\BoardEaseData\\uploads";
const ROOMS_JSON = "C:\\BoardEaseData\\json\\rooms.json";

const FILES = ["room1.jpg", "room2.jpg", "room3.jpg", "room4.jpg"];
const SINGLE_IMAGES = ["room1.jpg", "room3.jpg"];
const SHARED_IMAGES = ["room2.jpg", "room4.jpg"];

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

for (const name of FILES) {
  const src = path.join(SEED_DIR, name);
  if (!fs.existsSync(src)) {
    console.error(`Missing ${name} in ${SEED_DIR}`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(UPLOADS_DIR, name));
  console.log(`Copied ${name} → uploads`);
}

if (!fs.existsSync(ROOMS_JSON)) {
  console.error(`Rooms data not found: ${ROOMS_JSON}`);
  process.exit(1);
}

const rooms = JSON.parse(fs.readFileSync(ROOMS_JSON, "utf-8"));
let singleIdx = 0;
let sharedIdx = 0;

for (const room of rooms) {
  const type = (room.type || "").toLowerCase();
  if (type === "single") {
    room.images = SINGLE_IMAGES[singleIdx++ % SINGLE_IMAGES.length];
  } else {
    room.images = SHARED_IMAGES[sharedIdx++ % SHARED_IMAGES.length];
  }
}

fs.writeFileSync(ROOMS_JSON, JSON.stringify(rooms, null, 2));
console.log(`Assigned images to ${rooms.length} rooms in ${ROOMS_JSON}`);
