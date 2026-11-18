const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'incidents.db'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⚠️'
);

CREATE TABLE IF NOT EXISTS incidents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude    REAL NOT NULL,
  longitude   REAL NOT NULL,
  address     TEXT,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);

CREATE TABLE IF NOT EXISTS incident_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_tokens (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const DEFAULT_CATEGORIES = [
  ['accident', 'Accident', '🚗'],
  ['fighting', 'Fighting', '🥊'],
  ['rioting', 'Rioting', '🔥'],
  ['fire', 'Fire Outbreak', '🚒'],
  ['robbery', 'Robbery / Theft', '🦹'],
  ['flood', 'Flood', '🌊'],
  ['medical', 'Medical Emergency', '🚑'],
  ['other', 'Other', '⚠️'],
];
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (slug, name, icon) VALUES (?, ?, ?)');
for (const c of DEFAULT_CATEGORIES) insertCat.run(...c);

module.exports = db;
