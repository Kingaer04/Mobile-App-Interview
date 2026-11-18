/**
 * Seeds demo accounts and sample incidents so the app isn't empty.
 *   npm run seed           → adds demo data (skips if the demo accounts already exist)
 *   npm run seed -- --reset → removes previous demo data first, then re-seeds
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const PASSWORD = 'Password123';
const USERS = [
  { name: 'Amina Bello', email: 'amina@demo.com' },
  { name: 'Chidi Okafor', email: 'chidi@demo.com' },
  { name: 'Tunde Adeyemi', email: 'tunde@demo.com' },
];

// [user index, category, title, description, address, lat, lng, hours ago, photo count]
const INCIDENTS = [
  [0, 'accident', 'Two-car collision at Allen junction', 'A BRT bus and a saloon car collided at the junction. One person appears injured; LASEMA has been called. Traffic is building up in both directions.', 'Allen Avenue, Ikeja, Lagos', 6.6018, 3.3515, 0.3, 3],
  [1, 'fire', 'Fire outbreak at market stalls', 'Thick smoke from the textile section. Traders are trying to put it out with buckets; fire service not yet on scene.', 'Balogun Market, Lagos Island', 6.4573, 3.3880, 1.2, 2],
  [2, 'flood', 'Underpass completely flooded', 'Water is about a metre deep after this morning’s rain. Two cars are stuck — avoid the area.', 'Ojuelegba Underpass, Surulere', 6.5095, 3.3664, 2.5, 1],
  [0, 'rioting', 'Crowd blocking the expressway', 'A large crowd has blocked both lanes near the toll gate. Some tyres are being burnt. Police are arriving.', 'Lekki Toll Gate, Lekki', 6.4311, 3.4746, 4, 0],
  [1, 'fighting', 'Fight between bus conductors', 'Two conductors fighting over passengers at the park; others have joined in. Commuters are moving away.', 'Oshodi Bus Terminal, Oshodi', 6.5538, 3.3437, 6, 1],
  [2, 'robbery', 'Phone snatching at traffic light', 'Two men on a motorcycle snatched a phone from a driver at the traffic light and fled towards Obalende.', 'CMS Bus Stop, Lagos Island', 6.4517, 3.3896, 9, 0],
  [0, 'medical', 'Man collapsed at the bus stop', 'An elderly man collapsed and is unresponsive. Bystanders are helping; ambulance needed urgently.', 'Wuse Market, Abuja', 9.0765, 7.4686, 14, 0],
  [1, 'accident', 'Tanker overturned on the bridge', 'A diesel tanker has overturned and is leaking. Area is being cordoned off — keep away from the spill.', 'Third Mainland Bridge, Lagos', 6.5005, 3.4002, 22, 2],
  [2, 'other', 'Fallen electric pole across the road', 'A power line pole fell during the storm and is lying across the road. Wires may still be live.', 'Garki Area 11, Abuja', 9.0336, 7.4891, 30, 1],
  [0, 'flood', 'Drainage overflow in residential street', 'Blocked gutters have flooded the whole street; water entering homes.', 'Iyana Ipaja Road, Alimosho', 6.6113, 3.2606, 40, 2],
  [1, 'rioting', 'Clash between youths and task force', 'Stones being thrown after a task force raid on street traders. Shops are closing.', 'Mile 12 Market, Kosofe', 6.6052, 3.3990, 52, 0],
  [2, 'fighting', 'Brawl outside the stadium', 'Rival supporters fighting after the match. Security is trying to separate them.', 'Teslim Balogun Stadium, Surulere', 6.4989, 3.3644, 70, 1],
];

const PALETTES = {
  accident: [[245, 175, 70], [150, 70, 20]],
  fire: [[250, 120, 50], [120, 20, 20]],
  flood: [[90, 160, 230], [20, 50, 110]],
  rioting: [[220, 80, 70], [70, 20, 30]],
  fighting: [[170, 110, 210], [60, 30, 100]],
  robbery: [[110, 130, 150], [30, 40, 60]],
  medical: [[80, 200, 170], [10, 90, 80]],
  other: [[170, 175, 180], [70, 75, 80]],
};

/* --- tiny PNG writer (placeholder photos without extra dependencies) --- */
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    let c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** Deterministic PRNG so each placeholder is varied but reproducible. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * Stylised "street scene" placeholder: tinted sky, horizon glow, soft bokeh lights,
 * a road in perspective with lane markings, vignette and film grain.
 */
function placeholderPng([light, dark], variant, w = 800, h = 450) {
  const rand = rng(variant * 7919 + light[0] * 31 + dark[2]);
  const horizon = h * (0.5 + rand() * 0.12);
  const vpX = w * (0.35 + rand() * 0.3); // vanishing point
  const lights = Array.from({ length: 14 }, () => ({
    x: rand() * w, y: horizon - rand() * h * 0.35, r: 10 + rand() * 38, a: 0.18 + rand() * 0.35,
  }));
  const mix = (p, q, t) => p + (q - p) * t;
  const raw = Buffer.alloc((w * 3 + 1) * h);

  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) {
      let r, g, b;
      if (y < horizon) {
        // sky: dark at top → light near horizon, with a glow around the vanishing point
        const t = (y / horizon) ** 1.4;
        r = mix(dark[0], light[0], t); g = mix(dark[1], light[1], t); b = mix(dark[2], light[2], t);
        const glow = Math.max(0, 1 - Math.hypot((x - vpX) / (w * 0.45), (y - horizon) / (h * 0.25)));
        r += glow * 60; g += glow * 50; b += glow * 35;
        for (const l of lights) {
          const d = Math.hypot(x - l.x, y - l.y) / l.r;
          if (d < 1) { const k = (1 - d * d) * l.a; r += k * 255; g += k * 235; b += k * 200; }
        }
      } else {
        // ground: darker tone; road is a trapezoid converging on the vanishing point
        const depth = (y - horizon) / (h - horizon); // 0 at horizon → 1 at bottom
        r = dark[0] * 0.55; g = dark[1] * 0.55; b = dark[2] * 0.55;
        const halfRoad = 6 + depth * w * 0.42;
        const dx = x - vpX;
        if (Math.abs(dx) < halfRoad) {
          const shade = 55 + depth * 30;
          r = shade; g = shade; b = shade + 6;
          // dashed centre line
          if (Math.abs(dx) < 1 + depth * 5 && Math.floor((1 / (depth + 0.05)) * 3) % 2 === 0) { r = 235; g = 215; b = 120; }
          // edge lines
          if (Math.abs(Math.abs(dx) - halfRoad) < 1 + depth * 3) { r = 220; g = 220; b = 220; }
        }
      }
      // vignette + grain
      const vx = x / w - 0.5, vy = y / h - 0.5;
      const vig = 1 - (vx * vx + vy * vy) * 0.9;
      const grain = (rand() - 0.5) * 14;
      const o = row + 1 + x * 3;
      raw[o] = Math.max(0, Math.min(255, r * vig + grain));
      raw[o + 1] = Math.max(0, Math.min(255, g * vig + grain));
      raw[o + 2] = Math.max(0, Math.min(255, b * vig + grain));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- seeding --- */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const emails = USERS.map((u) => u.email);
const placeholders = emails.map(() => '?').join(',');

function removeDemoData() {
  const files = db.prepare(`
    SELECT ii.filename FROM incident_images ii
    JOIN incidents i ON i.id = ii.incident_id JOIN users u ON u.id = i.user_id
    WHERE u.email IN (${placeholders})`).all(...emails);
  files.forEach((f) => fs.rmSync(path.join(UPLOAD_DIR, f.filename), { force: true }));
  db.prepare(`DELETE FROM users WHERE email IN (${placeholders})`).run(...emails); // cascades to incidents/images
}

(async () => {
  const reset = process.argv.includes('--reset');
  const existing = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE email IN (${placeholders})`).get(...emails).n;
  if (existing && !reset) {
    console.log('Demo data already present. Run `npm run seed -- --reset` to recreate it.');
  } else {
    if (reset) removeDemoData();

    const hash = await bcrypt.hash(PASSWORD, 10);
    const userIds = USERS.map((u) =>
      db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(u.name, u.email, hash).lastInsertRowid);
    const catId = Object.fromEntries(db.prepare('SELECT id, slug FROM categories').all().map((c) => [c.slug, c.id]));

    const addIncident = db.prepare(`INSERT INTO incidents
      (user_id, category_id, title, description, latitude, longitude, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const addImage = db.prepare('INSERT INTO incident_images (incident_id, filename) VALUES (?, ?)');

    // Oldest first so ids increase with time (the feed sorts by id).
    const ordered = [...INCIDENTS].sort((x, y) => y[7] - x[7]);
    db.exec('BEGIN');
    try {
      for (const [u, cat, title, desc, address, lat, lng, hoursAgo, photos] of ordered) {
        const createdAt = new Date(Date.now() - hoursAgo * 3600e3).toISOString();
        const id = addIncident.run(userIds[u], catId[cat], title, desc, lat, lng, address, createdAt).lastInsertRowid;
        for (let p = 0; p < photos; p++) {
          const filename = `demo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
          fs.writeFileSync(path.join(UPLOAD_DIR, filename), placeholderPng(PALETTES[cat], Number(id) * 10 + p));
          addImage.run(id, filename);
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    console.log(`Seeded ${USERS.length} demo users and ${INCIDENTS.length} incidents.`);
  }

  console.log('\nDemo logins (password for all: %s)', PASSWORD);
  USERS.forEach((u) => console.log(`  ${u.email.padEnd(18)} ${u.name}`));
})();
