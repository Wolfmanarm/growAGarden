import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'garden.db')

// ─── Database setup ───────────────────────────────────────────────────────────
const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL COLLATE NOCASE,
    profile_json TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );
`)

const stmtFind   = db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`)
const stmtInsert = db.prepare(`INSERT INTO users (username, profile_json) VALUES (?, ?)`)
const stmtUpdate = db.prepare(`
  UPDATE users SET profile_json = ?, updated_at = datetime('now') WHERE username = ? COLLATE NOCASE
`)

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Login / register (username only, no passwords)
app.post('/api/login', (req, res) => {
  const { username, profile } = req.body
  if (!username || typeof username !== 'string' || username.trim().length < 1) {
    return res.status(400).json({ error: 'username required' })
  }
  const name = username.trim().slice(0, 30)
  let row = stmtFind.get(name)
  if (!row) {
    // New user — seed with provided starter profile or empty object
    const starter = profile ? JSON.stringify(profile) : '{}'
    stmtInsert.run(name, starter)
    row = stmtFind.get(name)
  }
  try {
    const savedProfile = JSON.parse(row.profile_json)
    res.json({ ok: true, profile: savedProfile, isNew: !savedProfile.username })
  } catch {
    res.json({ ok: true, profile: {}, isNew: true })
  }
})

// Save profile
app.post('/api/save', (req, res) => {
  const { username, profile } = req.body
  if (!username || !profile) return res.status(400).json({ error: 'username and profile required' })
  const name = username.trim().slice(0, 30)
  const row = stmtFind.get(name)
  if (!row) return res.status(404).json({ error: 'user not found' })
  stmtUpdate.run(JSON.stringify(profile), name)
  res.json({ ok: true })
})

// Load profile
app.get('/api/load/:username', (req, res) => {
  const row = stmtFind.get(req.params.username)
  if (!row) return res.status(404).json({ error: 'user not found' })
  try {
    res.json({ ok: true, profile: JSON.parse(row.profile_json) })
  } catch {
    res.status(500).json({ error: 'corrupt profile' })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🌱 Garden API running on http://localhost:${PORT}`)
})
