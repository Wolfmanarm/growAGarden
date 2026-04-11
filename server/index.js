import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH   = join(__dirname, 'garden.db')
const ROUNDS    = 10

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT,
    profile_json  TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );
`)

// Migration: add password_hash to existing databases that don't have it
try { db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`) } catch {}

// Feedback table (task 3)
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT,
    message    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)
const stmtFeedback = db.prepare(`INSERT INTO feedback (username, message) VALUES (?, ?)`)

const stmtFind   = db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`)
const stmtInsert = db.prepare(`INSERT INTO users (username, password_hash, profile_json) VALUES (?, ?, ?)`)
const stmtUpdate = db.prepare(
  `UPDATE users SET profile_json = ?, updated_at = datetime('now') WHERE username = ? COLLATE NOCASE`
)
const stmtSetPwd = db.prepare(
  `UPDATE users SET password_hash = ? WHERE username = ? COLLATE NOCASE`
)

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '2mb' }))

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Check if username exists (task 7: two-step login)
app.get('/api/check/:username', (req, res) => {
  const row = stmtFind.get(req.params.username)
  res.json({ exists: !!row, hasPassword: row ? !!row.password_hash : false })
})

// Register new account (task 7)
app.post('/api/register', async (req, res) => {
  const { username, password, profile } = req.body
  if (!username?.trim()) return res.status(400).json({ error: 'username required' })
  if (!password || password.length < 4) return res.status(400).json({ error: 'password must be at least 4 characters' })

  const name = username.trim().slice(0, 30)
  if (stmtFind.get(name)) return res.status(409).json({ error: 'username already taken' })

  const hash = await bcrypt.hash(password, ROUNDS)
  stmtInsert.run(name, hash, JSON.stringify(profile || {}))
  const row = stmtFind.get(name)
  res.json({ ok: true, profile: JSON.parse(row.profile_json), isNew: true })
})

// Login existing account (task 7)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username?.trim()) return res.status(400).json({ error: 'username required' })

  const name = username.trim().slice(0, 30)
  const row  = stmtFind.get(name)
  if (!row) return res.status(404).json({ error: 'user not found' })

  // Verify password if one is set; allow legacy (no password) accounts through
  if (row.password_hash) {
    if (!password) return res.status(401).json({ error: 'password required' })
    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) return res.status(401).json({ error: 'incorrect password' })
  } else if (password) {
    // First time setting a password on a legacy account
    const hash = await bcrypt.hash(password, ROUNDS)
    stmtSetPwd.run(hash, name)
  }

  try {
    res.json({ ok: true, profile: JSON.parse(row.profile_json) })
  } catch {
    res.status(500).json({ error: 'corrupt profile' })
  }
})

// Save profile
app.post('/api/save', (req, res) => {
  const { username, profile } = req.body
  if (!username || !profile) return res.status(400).json({ error: 'username and profile required' })
  const name = username.trim().slice(0, 30)
  if (!stmtFind.get(name)) return res.status(404).json({ error: 'user not found' })
  stmtUpdate.run(JSON.stringify(profile), name)
  res.json({ ok: true })
})

// Load profile
app.get('/api/load/:username', (req, res) => {
  const row = stmtFind.get(req.params.username)
  if (!row) return res.status(404).json({ error: 'user not found' })
  try { res.json({ ok: true, profile: JSON.parse(row.profile_json) }) }
  catch { res.status(500).json({ error: 'corrupt profile' }) }
})

// Submit feedback (task 3)
app.post('/api/feedback', (req, res) => {
  const { username, message } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })
  stmtFeedback.run(username || 'anonymous', message.trim().slice(0, 1000))
  res.json({ ok: true })
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🌱 Garden API → http://localhost:${PORT}`))
