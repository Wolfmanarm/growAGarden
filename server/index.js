import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'garden.db')
const ROUNDS = 10

// ─── Database Adapter ─────────────────────────────────────────────────────────
// Use PostgreSQL in production (DATABASE_URL env var), SQLite for development

let query
let db

if (process.env.DATABASE_URL) {
  // ─── PostgreSQL (Production) ──────────────────────────────────────────
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  query = async (sql, params) => {
    const result = await pool.query(sql, params)
    return result.rows
  }

  // Initialize PostgreSQL schema
  const initPostgres = async () => {
    try {
      // Enable CITEXT extension
      await pool.query('CREATE EXTENSION IF NOT EXISTS citext')

      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          username      CITEXT UNIQUE NOT NULL,
          password_hash TEXT,
          profile_json  TEXT NOT NULL DEFAULT '{}',
          created_at    TIMESTAMPTZ DEFAULT NOW(),
          updated_at    TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      // Create feedback table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id         SERIAL PRIMARY KEY,
          username   TEXT,
          message    TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      console.log('🌱 PostgreSQL schema initialized')
    } catch (err) {
      console.error('Failed to initialize PostgreSQL schema:', err)
      throw err
    }
  }

  await initPostgres()
} else {
  // ─── SQLite (Development) ─────────────────────────────────────────────
  const { default: Database } = await import('better-sqlite3')
  db = new Database(DB_PATH)

  query = async (sql, params) => {
    // Convert $1, $2... to ? placeholders for SQLite
    let sqliteSql = sql
    let paramArray = params || []

    // Replace $1, $2, $3, etc. with ? in order
    if (Array.isArray(paramArray) && paramArray.length > 0) {
      let paramIndex = 1
      while (sqliteSql.includes(`$${paramIndex}`)) {
        sqliteSql = sqliteSql.replace(`$${paramIndex}`, '?')
        paramIndex++
      }
    }

    const stmt = db.prepare(sqliteSql)
    if (paramArray.length > 0) {
      return stmt.all(...paramArray)
    } else {
      return stmt.all()
    }
  }

  // Initialize SQLite schema
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT,
      message    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  console.log('🌱 SQLite initialized')
}

// ─── Database Helper Functions ─────────────────────────────────────────────────

const findUser = async (username) => {
  const rows = await query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  )
  return rows[0] || null
}

const createUser = async (username, passwordHash, profileJson) => {
  await query(
    'INSERT INTO users (username, password_hash, profile_json) VALUES ($1, $2, $3)',
    [username, passwordHash, profileJson]
  )
  return findUser(username)
}

const updateProfile = async (profileJson, username) => {
  const updateSql = process.env.DATABASE_URL
    ? 'UPDATE users SET profile_json = $1, updated_at = NOW() WHERE username = $2'
    : 'UPDATE users SET profile_json = $1, updated_at = datetime(\'now\') WHERE username = $2'

  await query(updateSql, [profileJson, username])
}

const setPassword = async (passwordHash, username) => {
  await query(
    'UPDATE users SET password_hash = $1 WHERE username = $2',
    [passwordHash, username]
  )
}

const insertFeedback = async (username, message) => {
  await query(
    'INSERT INTO feedback (username, message) VALUES ($1, $2)',
    [username, message]
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
const DIST = join(__dirname, '../dist')
const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '2mb' }))

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Check if username exists (task 7: two-step login)
app.get('/api/check/:username', async (req, res) => {
  try {
    const row = await findUser(req.params.username)
    res.json({ exists: !!row, hasPassword: row ? !!row.password_hash : false })
  } catch (err) {
    console.error('Error in /api/check:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

// Register new account (task 7)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, profile } = req.body
    if (!username?.trim()) return res.status(400).json({ error: 'username required' })
    if (!password || password.length < 4) return res.status(400).json({ error: 'password must be at least 4 characters' })

    const name = username.trim().slice(0, 30)
    const existing = await findUser(name)
    if (existing) return res.status(409).json({ error: 'username already taken' })

    const hash = await bcrypt.hash(password, ROUNDS)
    await createUser(name, hash, JSON.stringify(profile || {}))
    const row = await findUser(name)
    res.json({ ok: true, profile: JSON.parse(row.profile_json), isNew: true })
  } catch (err) {
    console.error('Error in /api/register:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login existing account (task 7)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username?.trim()) return res.status(400).json({ error: 'username required' })

    const name = username.trim().slice(0, 30)
    const row = await findUser(name)
    if (!row) return res.status(404).json({ error: 'user not found' })

    // Verify password if one is set; allow legacy (no password) accounts through
    if (row.password_hash) {
      if (!password) return res.status(401).json({ error: 'password required' })
      const ok = await bcrypt.compare(password, row.password_hash)
      if (!ok) return res.status(401).json({ error: 'incorrect password' })
    } else if (password) {
      // First time setting a password on a legacy account
      const hash = await bcrypt.hash(password, ROUNDS)
      await setPassword(hash, name)
    }

    try {
      res.json({ ok: true, profile: JSON.parse(row.profile_json) })
    } catch {
      res.status(500).json({ error: 'corrupt profile' })
    }
  } catch (err) {
    console.error('Error in /api/login:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Save profile
app.post('/api/save', async (req, res) => {
  try {
    const { username, profile } = req.body
    if (!username || !profile) return res.status(400).json({ error: 'username and profile required' })
    const name = username.trim().slice(0, 30)
    const row = await findUser(name)
    if (!row) return res.status(404).json({ error: 'user not found' })
    await updateProfile(JSON.stringify(profile), name)
    res.json({ ok: true })
  } catch (err) {
    console.error('Error in /api/save:', err)
    res.status(500).json({ error: 'Save failed' })
  }
})

// Load profile
app.get('/api/load/:username', async (req, res) => {
  try {
    const row = await findUser(req.params.username)
    if (!row) return res.status(404).json({ error: 'user not found' })
    try {
      res.json({ ok: true, profile: JSON.parse(row.profile_json) })
    } catch {
      res.status(500).json({ error: 'corrupt profile' })
    }
  } catch (err) {
    console.error('Error in /api/load:', err)
    res.status(500).json({ error: 'Load failed' })
  }
})

// Submit feedback (task 3)
app.post('/api/feedback', async (req, res) => {
  try {
    const { username, message } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'message required' })
    await insertFeedback(username || 'anonymous', message.trim().slice(0, 1000))
    res.json({ ok: true })
  } catch (err) {
    console.error('Error in /api/feedback:', err)
    res.status(500).json({ error: 'Feedback submission failed' })
  }
})

// ─── Static frontend (production) ────────────────────────────────────────────
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')))
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🌱 Garden API → http://localhost:${PORT}`))
