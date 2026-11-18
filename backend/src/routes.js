const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signToken, requireAuth, optionalAuth } = require('./auth');
const { notifyNewIncident } = require('./notify');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ---------- helpers ---------- */

const INCIDENT_SELECT = `
  SELECT i.*, u.name AS user_name,
         c.slug AS cat_slug, c.name AS cat_name, c.icon AS cat_icon
  FROM incidents i
  JOIN users u ON u.id = i.user_id
  JOIN categories c ON c.id = i.category_id
`;

function baseUrl(req) {
  return process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

function serializeIncident(row, req) {
  const images = db
    .prepare('SELECT filename FROM incident_images WHERE incident_id = ? ORDER BY id')
    .all(row.id)
    .map((r) => `${baseUrl(req)}/uploads/${r.filename}`);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    images,
    category: { slug: row.cat_slug, name: row.cat_name, icon: row.cat_icon },
    user: { id: row.user_id, name: row.user_name },
  };
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email };
}

function paging(req) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
}

function listIncidents(req, where, params) {
  const { limit, offset, page } = paging(req);
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM incidents i JOIN categories c ON c.id = i.category_id ${clause}`)
    .get(...params).n;
  const rows = db
    .prepare(`${INCIDENT_SELECT} ${clause} ORDER BY i.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { items: rows.map((r) => serializeIncident(r, req)), page, total, hasMore: offset + rows.length < total };
}

/* ---------- router ---------- */

module.exports = function buildRouter(io) {
  const r = express.Router();

  r.get('/health', (_req, res) => res.json({ ok: true }));

  /* Auth */
  r.post('/auth/register', asyncH(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }));

  r.post('/auth/login', asyncH(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  r.get('/auth/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: publicUser(user) });
  });

  /* Categories (with incident counts) */
  r.get('/categories', (_req, res) => {
    const rows = db.prepare(`
      SELECT c.slug, c.name, c.icon, COUNT(i.id) AS count
      FROM categories c LEFT JOIN incidents i ON i.category_id = c.id
      GROUP BY c.id ORDER BY c.id`).all();
    res.json(rows);
  });

  /* Incidents */
  r.get('/incidents', (req, res) => {
    const where = ["i.status = 'published'"];
    const params = [];
    if (req.query.category) { where.push('c.slug = ?'); params.push(String(req.query.category)); }
    if (req.query.q) {
      where.push('(i.title LIKE ? OR i.description LIKE ? OR i.address LIKE ?)');
      const q = `%${req.query.q}%`;
      params.push(q, q, q);
    }
    if (req.query.after) { where.push('i.id > ?'); params.push(parseInt(req.query.after, 10) || 0); }
    res.json(listIncidents(req, where, params));
  });

  r.get('/incidents/mine', requireAuth, (req, res) => {
    res.json(listIncidents(req, ['i.user_id = ?'], [req.user.id]));
  });

  r.get('/incidents/:id', (req, res) => {
    const row = db.prepare(`${INCIDENT_SELECT} WHERE i.id = ?`).get(parseInt(req.params.id, 10) || 0);
    if (!row) return res.status(404).json({ error: 'Incident not found.' });
    res.json(serializeIncident(row, req));
  });

  r.post('/incidents', requireAuth, upload.array('images', 5), asyncH(async (req, res) => {
    const cleanup = () => (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const address = String(req.body.address || '').trim() || null;
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(String(req.body.category || ''));

    let error;
    if (!title) error = 'Please give the incident a title.';
    else if (!category) error = 'Please choose a valid category.';
    else if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      error = 'A valid location (latitude & longitude) is required.';
    }
    if (error) { cleanup(); return res.status(400).json({ error }); }

    // Insert incident + images atomically. Incidents are published immediately.
    let id;
    db.exec('BEGIN');
    try {
      id = db.prepare(`INSERT INTO incidents (user_id, category_id, title, description, latitude, longitude, address)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.id, category.id, title, description, lat, lng, address).lastInsertRowid;
      const addImg = db.prepare('INSERT INTO incident_images (incident_id, filename) VALUES (?, ?)');
      for (const f of req.files || []) addImg.run(id, f.filename);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      cleanup();
      throw e;
    }

    const incident = serializeIncident(db.prepare(`${INCIDENT_SELECT} WHERE i.id = ?`).get(id), req);
    res.status(201).json(incident);
    notifyNewIncident(io, incident).catch((e) => console.warn('[notify]', e.message));
  }));

  r.delete('/incidents/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10) || 0;
    const row = db.prepare('SELECT user_id FROM incidents WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Incident not found.' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own reports.' });
    const files = db.prepare('SELECT filename FROM incident_images WHERE incident_id = ?').all(id);
    db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
    files.forEach((f) => fs.unlink(path.join(UPLOAD_DIR, f.filename), () => {}));
    io.emit('incident:deleted', { id });
    res.status(204).end();
  });

  /* Push notification tokens (Expo) */
  r.post('/push-tokens', optionalAuth, (req, res) => {
    const token = String(req.body.token || '');
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) return res.status(400).json({ error: 'Invalid Expo push token.' });
    const userId = req.user?.id ?? null;
    db.prepare(`INSERT INTO push_tokens (token, user_id, updated_at) VALUES (?, ?, datetime('now'))
                ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at`)
      .run(token, userId);
    res.json({ ok: true });
  });

  /* Errors (incl. multer) */
  // eslint-disable-next-line no-unused-vars
  r.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 8 MB.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'You can attach up to 5 images.'
        : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err.message === 'Only image files are allowed.') return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return r;
};
