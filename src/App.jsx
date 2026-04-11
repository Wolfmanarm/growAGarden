import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, X, User, LogOut } from 'lucide-react'
import Garden3D from './Garden3D'
import { PLANTS, DEFAULT_UNLOCKED, DEFAULT_OWNED_SEEDS } from './plants'

// ─── Shop items (upgrades) ────────────────────────────────────────────────────
const SHOP_ITEMS = {
  waterer: {
    id: 'waterer', name: 'Auto Waterer', emoji: '💧',
    description: 'Auto-harvests plots when ready.',
    baseCost: 50, maxCount: 10,
  },
  fertilizer: {
    id: 'fertilizer', name: 'Fertilizer', emoji: '✨',
    description: 'Next plant grows 2× faster!',
    baseCost: 25, maxCount: 99,
  },
  plot_expansion: {
    id: 'plot_expansion', name: 'Extra Plot Row', emoji: '🪴',
    description: 'Unlock 5 more plots! (up to 20 rows)',
    baseCost: 80, maxCount: 15,    // task 3: max 15 extra rows = 20 total
  },
}

// ─── API helpers (task 1) ─────────────────────────────────────────────────────
const API = 'http://localhost:3001/api'
let apiAvailable = null   // null=unknown, true, false

async function checkApi() {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(1500) })
    apiAvailable = r.ok
  } catch { apiAvailable = false }
  return apiAvailable
}

async function apiLogin(username, starterProfile) {
  try {
    const r = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, profile: starterProfile }),
      signal: AbortSignal.timeout(3000),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function apiSave(username, profile) {
  try {
    await fetch(`${API}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, profile }),
      signal: AbortSignal.timeout(3000),
    })
  } catch { /* silent fallback to localStorage */ }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'growagarden_v3'

function hydrateProfile(data) {
  const now = Date.now()
  data.plots = (data.plots || []).map(plot => {
    if (!plot) return null
    if (plot.state === 'growing') {
      const totalElapsed = (plot.elapsed || 0) + (now - (plot.savedAt || now))
      if (totalElapsed >= plot.totalGrowTime) return { ...plot, state: 'ready' }
      return { ...plot, elapsed: totalElapsed, savedAt: now }
    }
    return plot
  })
  // Ensure all plant IDs exist in ownedSeeds
  data.ownedSeeds = { ...DEFAULT_OWNED_SEEDS, ...(data.ownedSeeds || {}) }
  // Ensure unlockedPlants is an array
  if (!data.unlockedPlants) data.unlockedPlants = ['daisy']
  return data
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return hydrateProfile(JSON.parse(raw))
  } catch { return null }
}

function saveLocal(profile) {
  const now = Date.now()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...profile,
    plots: profile.plots.map(p => p ? { ...p, savedAt: now } : null),
  }))
}

function defaultProfile(username = '') {
  return {
    username,
    petals: 10,
    plots: Array(25).fill(null),
    extraRows: 0,
    ownedSeeds: { ...DEFAULT_OWNED_SEEDS },
    unlockedPlants: ['daisy'],
    waterers: 0,
    hasFertilizer: false,
    totalHarvested: 0,
  }
}

// ─── Login overlay ────────────────────────────────────────────────────────────
function LoginOverlay({ onLogin }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onLogin(name.trim())
    setLoading(false)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,rgba(240,253,244,.97),rgba(254,252,232,.97) 50%,rgba(252,231,243,.97))' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
        initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18 }}
      >
        <motion.div className="text-6xl mb-4"
          animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>🌸</motion.div>
        <h1 className="text-3xl font-extrabold text-green-700 mb-1">Grow a Garden</h1>
        <p className="text-gray-400 text-sm mb-6">A cozy little flower farm</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-sm font-semibold text-green-700 mb-1">Your name</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Lily, Blossom…" maxLength={20}
              className="w-full border-2 border-green-200 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:border-green-400 transition-colors" />
          </div>
          <motion.button type="submit" disabled={!name.trim() || loading}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white font-bold rounded-xl py-3 disabled:opacity-40 shadow-md"
            whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
            {loading ? 'Loading…' : 'Start Gardening 🌱'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Shop panel ───────────────────────────────────────────────────────────────
function ShopPanel({ profile, onBuySeed, onUnlock, onBuyItem, onClose }) {
  const [tab, setTab] = useState('seeds')
  const [tierFilter, setTierFilter] = useState(0)   // 0 = all

  const plantList = Object.values(PLANTS)
  const filtered = tierFilter ? plantList.filter(p => p.tier === tierFilter) : plantList

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
        initial={{ y: 60, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-green-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Garden Shop</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-3 py-1.5">
              <span>🌸</span><span className="font-bold text-yellow-600">{profile.petals.toLocaleString()}</span>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['seeds', 'upgrades'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold capitalize ${tab === t ? 'text-green-600 border-b-2 border-green-400' : 'text-gray-400'}`}>
              {t === 'seeds' ? '🌱 Plants (100)' : '⚡ Upgrades'}
            </button>
          ))}
        </div>

        {/* Tier filter (seeds tab) */}
        {tab === 'seeds' && (
          <div className="flex gap-1.5 px-4 py-2 border-b border-gray-100 overflow-x-auto">
            {[0, 1, 2, 3, 4, 5].map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${tierFilter === t ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {t === 0 ? 'All' : ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][t]}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {tab === 'seeds' && filtered.map(plant => {
            const owned = profile.ownedSeeds[plant.id] || 0
            const isUnlocked = (profile.unlockedPlants || []).includes(plant.id)
            const canAffordUnlock = profile.petals >= plant.unlockCost
            const canAffordSeeds = profile.petals >= plant.seedCost
            const isFree = plant.seedCost === 0

            return (
              <motion.div key={plant.id} whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${plant.border} bg-gradient-to-r ${plant.color} ${!isUnlocked ? 'opacity-80' : ''}`}>
                <span className="text-2xl">{plant.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-800 text-sm">{plant.name}</span>
                    <span className="text-xs bg-white/60 rounded-full px-1.5 py-0.5 text-gray-500 font-semibold">{plant.label}</span>
                    {!isUnlocked && <span className="text-xs">🔒</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{plant.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {isUnlocked ? (
                    <>
                      <span className="text-xs text-gray-400">×{owned}</span>
                      <motion.button onClick={() => onBuySeed(plant.id)}
                        disabled={!isFree && (!canAffordSeeds || owned >= 99)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl ${isFree ? 'bg-green-100 text-green-700 cursor-default' : canAffordSeeds ? 'bg-white text-gray-700 shadow hover:shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        whileTap={(canAffordSeeds || isFree) ? { scale: 0.9 } : {}}>
                        {isFree ? 'Free' : `🌸 ${plant.seedCost.toLocaleString()}`}
                      </motion.button>
                    </>
                  ) : (
                    <motion.button onClick={() => onUnlock(plant.id)}
                      disabled={!canAffordUnlock}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl ${canAffordUnlock ? 'bg-green-500 text-white shadow hover:shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      whileTap={canAffordUnlock ? { scale: 0.9 } : {}}>
                      Unlock 🌸 {plant.unlockCost.toLocaleString()}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}

          {tab === 'upgrades' && Object.values(SHOP_ITEMS).map(item => {
            const count = item.id === 'waterer' ? profile.waterers
              : item.id === 'fertilizer' ? (profile.hasFertilizer ? 1 : 0)
              : (profile.extraRows || 0)
            const cost = item.id === 'plot_expansion'
              ? item.baseCost * (1 + (profile.extraRows || 0)) : item.baseCost
            const canAfford = profile.petals >= cost
            const maxed = count >= item.maxCount
            return (
              <motion.div key={item.id} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-3 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                  {item.id !== 'fertilizer' && <div className="text-xs text-blue-500 mt-0.5">{count} / {item.maxCount}</div>}
                </div>
                <motion.button onClick={() => onBuyItem(item.id, cost)}
                  disabled={!canAfford || maxed}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl ${maxed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : canAfford ? 'bg-white text-gray-700 shadow hover:shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  whileTap={canAfford && !maxed ? { scale: 0.9 } : {}}>
                  {maxed ? 'Max' : `🌸 ${cost.toLocaleString()}`}
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Stats / profile panel (task 2: logout) ───────────────────────────────────
function StatsPanel({ profile, onClose, onLogout }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-800">Your Garden</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          {[
            { bg: 'bg-yellow-50', icon: '🌸', label: 'PETALS BALANCE',   val: profile.petals.toLocaleString(),         color: 'text-yellow-600' },
            { bg: 'bg-green-50',  icon: '🌾', label: 'TOTAL HARVESTED',  val: profile.totalHarvested.toLocaleString(),  color: 'text-green-600'  },
            { bg: 'bg-blue-50',   icon: '💧', label: 'AUTO WATERERS',    val: profile.waterers,                         color: 'text-blue-600'   },
            { bg: 'bg-purple-50', icon: '🪴', label: 'PLOT ROWS',        val: 5 + (profile.extraRows || 0),             color: 'text-purple-600' },
            { bg: 'bg-pink-50',   icon: '🌱', label: 'PLANTS UNLOCKED',  val: (profile.unlockedPlants || []).length,    color: 'text-pink-600'   },
          ].map(({ bg, icon, label, val, color }) => (
            <div key={label} className={`flex items-center gap-3 p-3 ${bg} rounded-2xl`}>
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="text-xs text-gray-400 font-semibold">{label}</div>
                <div className={`text-xl font-extrabold ${color}`}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Logout button (task 2) */}
        <motion.button
          onClick={onLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl py-3 transition-colors"
          whileTap={{ scale: 0.97 }}>
          <LogOut size={16} /> Log Out
        </motion.button>

        <button onClick={() => {
          if (window.confirm('Reset all progress? This cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY); window.location.reload()
          }
        }} className="mt-2 w-full text-sm text-red-400 hover:text-red-600 font-semibold py-1">
          Reset Garden
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile]       = useState(null)
  const [showLogin, setShowLogin]   = useState(false)
  const [showShop, setShowShop]     = useState(false)
  const [showStats, setShowStats]   = useState(false)
  const [selectedSeed, setSelectedSeed] = useState('daisy')
  const [toast, setToast]           = useState(null)
  const [dbStatus, setDbStatus]     = useState('…')
  const tickerRef = useRef()
  const saveTimerRef = useRef()

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const ok = await checkApi()
      setDbStatus(ok ? '🟢 DB connected' : '🟡 Local only')

      const local = loadLocal()
      if (local?.username) {
        // Try to load from server (fresher data)
        if (ok) {
          try {
            const r = await fetch(`${API}/load/${encodeURIComponent(local.username)}`, { signal: AbortSignal.timeout(2000) })
            if (r.ok) {
              const { profile: serverProfile } = await r.json()
              if (serverProfile?.username) {
                setProfile(hydrateProfile(serverProfile))
                return
              }
            }
          } catch {}
        }
        setProfile(local)
      } else {
        setShowLogin(true)
        setProfile(defaultProfile())
      }
    })()
  }, [])

  // ── Auto-save (debounced, both local + API) ────────────────────────────────
  useEffect(() => {
    if (!profile?.username) return
    saveLocal(profile)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (apiAvailable) apiSave(profile.username, profile)
    }, 2000)
  }, [profile])

  // ── Auto-waterer ticker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    clearInterval(tickerRef.current)
    tickerRef.current = setInterval(() => {
      setProfile(prev => {
        if (!prev || prev.waterers === 0) return prev
        const now = Date.now()
        let gained = 0
        const newPlots = prev.plots.map(plot => {
          if (!plot) return null
          const plant = PLANTS[plot.seedId]
          if (!plant) return null
          if (plot.state === 'ready') { gained += plant.reward; return null }
          if (plot.state === 'growing') {
            const elapsed = (plot.elapsed || 0) + (now - (plot.savedAt || now))
            if (elapsed >= plot.totalGrowTime) return { ...plot, state: 'ready', savedAt: now }
          }
          return plot
        })
        if (gained === 0 && JSON.stringify(newPlots) === JSON.stringify(prev.plots)) return prev
        return { ...prev, petals: prev.petals + gained, totalHarvested: prev.totalHarvested + gained, plots: newPlots }
      })
    }, 500)
    return () => clearInterval(tickerRef.current)
  }, [profile?.waterers])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── Login (task 1: create/load from DB) ────────────────────────────────────
  const handleLogin = useCallback(async (username) => {
    const starter = defaultProfile(username)
    let loaded = starter

    if (apiAvailable) {
      const result = await apiLogin(username, starter)
      if (result?.profile?.username) {
        loaded = hydrateProfile(result.profile)
      } else if (result?.isNew || result) {
        // New user created on server, set username
        loaded = hydrateProfile({ ...starter, username })
      }
    } else {
      // Check localStorage for this username
      const local = loadLocal()
      if (local?.username?.toLowerCase() === username.toLowerCase()) {
        loaded = local
      } else {
        loaded = { ...starter, username }
      }
    }

    setProfile(loaded)
    setShowLogin(false)
    showToast(`Welcome${loaded.totalHarvested > 0 ? ' back' : ''}, ${username}! 🌸`)
  }, [showToast])

  // ── Logout (task 2) ────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setShowStats(false)
    localStorage.removeItem(STORAGE_KEY)
    setProfile(defaultProfile())
    setShowLogin(true)
  }, [])

  // ── Plot click ─────────────────────────────────────────────────────────────
  const handlePlotClick = useCallback((index) => {
    setProfile(prev => {
      if (!prev) return prev
      const plot = prev.plots[index]
      const plant = plot ? PLANTS[plot.seedId] : null

      const isGrown = plot && plant && (
        plot.state === 'ready' ||
        (plot.state === 'growing' &&
          (plot.elapsed || 0) + (Date.now() - (plot.savedAt || Date.now())) >= plot.totalGrowTime)
      )

      if (isGrown) {
        const newPlots = [...prev.plots]
        newPlots[index] = null
        showToast(`+${plant.reward.toLocaleString()} 🌸 ${plant.name} harvested!`)
        return { ...prev, petals: prev.petals + plant.reward, totalHarvested: prev.totalHarvested + plant.reward, plots: newPlots }
      }

      if (!plot && selectedSeed) {
        const p = PLANTS[selectedSeed]
        if (!p) return prev
        const owned = prev.ownedSeeds[selectedSeed] || 0
        const isUnlocked = (prev.unlockedPlants || []).includes(selectedSeed)
        if (!isUnlocked) { showToast(`Unlock ${p.name} in the shop first! 🔒`); return prev }
        if (p.seedCost > 0 && owned === 0) { showToast(`No ${p.name} seeds! Buy from the shop.`); return prev }
        const totalGrowTime = p.growTime * (prev.hasFertilizer ? 0.5 : 1)
        const newPlots = [...prev.plots]
        newPlots[index] = { seedId: selectedSeed, state: 'growing', elapsed: 0, totalGrowTime, savedAt: Date.now() }
        const newOwned = { ...prev.ownedSeeds }
        if (p.seedCost > 0) newOwned[selectedSeed] = Math.max(0, owned - 1)
        return { ...prev, plots: newPlots, ownedSeeds: newOwned, hasFertilizer: false }
      }
      return prev
    })
  }, [selectedSeed, showToast])

  // ── Buy seeds ─────────────────────────────────────────────────────────────
  const handleBuySeed = useCallback((plantId) => {
    const plant = PLANTS[plantId]
    if (!plant || plant.seedCost === 0) return
    setProfile(prev => {
      if (!prev || prev.petals < plant.seedCost) return prev
      const newOwned = { ...prev.ownedSeeds, [plantId]: (prev.ownedSeeds[plantId] || 0) + 5 }
      showToast(`Bought 5× ${plant.emoji} ${plant.name}!`)
      return { ...prev, petals: prev.petals - plant.seedCost, ownedSeeds: newOwned }
    })
  }, [showToast])

  // ── Unlock plant (task 5) ─────────────────────────────────────────────────
  const handleUnlock = useCallback((plantId) => {
    const plant = PLANTS[plantId]
    if (!plant) return
    setProfile(prev => {
      if (!prev || prev.petals < plant.unlockCost) return prev
      if ((prev.unlockedPlants || []).includes(plantId)) return prev
      showToast(`🔓 ${plant.name} unlocked! You can now buy seeds.`)
      return {
        ...prev,
        petals: prev.petals - plant.unlockCost,
        unlockedPlants: [...(prev.unlockedPlants || []), plantId],
      }
    })
  }, [showToast])

  // ── Buy upgrade ───────────────────────────────────────────────────────────
  const handleBuyItem = useCallback((itemId, cost) => {
    setProfile(prev => {
      if (!prev || prev.petals < cost) return prev
      const update = { petals: prev.petals - cost }
      if (itemId === 'waterer') {
        if (prev.waterers >= 10) return prev
        update.waterers = prev.waterers + 1
        showToast('Auto Waterer activated! 💧')
      } else if (itemId === 'fertilizer') {
        update.hasFertilizer = true
        showToast('Fertilizer ready! Next plant grows 2× faster ✨')
      } else if (itemId === 'plot_expansion') {
        const extra = prev.extraRows || 0
        if (extra >= 15) return prev
        update.extraRows = extra + 1
        update.plots = [...prev.plots, ...Array(5).fill(null)]
        showToast('Garden expanded! 🪴 New row unlocked!')
      }
      return { ...prev, ...update }
    })
  }, [showToast])

  if (!profile) return null

  const totalRows = 5 + (profile.extraRows || 0)
  const plots = [...profile.plots]
  while (plots.length < totalRows * 5) plots.push(null)

  const unlockedPlants = profile.unlockedPlants || ['daisy']
  const seedBarPlants = Object.values(PLANTS).filter(p => unlockedPlants.includes(p.id))

  return (
    <div className="fixed inset-0 overflow-hidden font-rounded">
      <Garden3D plots={plots} selectedSeed={selectedSeed} onPlotClick={handlePlotClick} profile={profile} />

      <AnimatePresence>
        {showLogin && <LoginOverlay onLogin={handleLogin} />}
      </AnimatePresence>
      <AnimatePresence>
        {showShop && (
          <ShopPanel profile={profile}
            onBuySeed={handleBuySeed} onUnlock={handleUnlock}
            onBuyItem={handleBuyItem} onClose={() => setShowShop(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showStats && (
          <StatsPanel profile={profile} onClose={() => setShowStats(false)} onLogout={handleLogout} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur text-gray-800 font-bold px-5 py-3 rounded-2xl shadow-xl text-sm whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-start justify-between p-3 sm:p-4">
          <div className="bg-white/80 backdrop-blur rounded-2xl px-4 py-2 shadow pointer-events-auto">
            <div className="text-lg font-extrabold text-green-700 leading-tight">🌸 Grow a Garden</div>
            {profile.username && (
              <div className="text-xs text-gray-400 font-semibold">Welcome back, {profile.username}! 👋</div>
            )}
            <div className="text-xs text-gray-300 font-medium">{dbStatus}</div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-yellow-200 rounded-2xl px-3 py-2 shadow">
              <span>🌸</span>
              <span className="font-extrabold text-yellow-600 text-lg">{profile.petals.toLocaleString()}</span>
            </div>
            {profile.waterers > 0 && (
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur border border-blue-200 rounded-2xl px-2.5 py-2 shadow">
                <span className="text-sm">💧</span>
                <span className="text-xs font-bold text-blue-500">{profile.waterers}</span>
              </div>
            )}
            <motion.button onClick={() => setShowStats(true)}
              className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-2 shadow text-gray-500 hover:text-green-600"
              whileTap={{ scale: 0.9 }}>
              <User size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 space-y-2">
        {profile.hasFertilizer && (
          <motion.p className="text-center text-xs text-purple-600 font-bold bg-white/80 backdrop-blur rounded-xl py-1"
            animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            ✨ Fertilizer active — next plant grows 2× faster!
          </motion.p>
        )}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-2.5 shadow flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Seed</span>
          {seedBarPlants.map(plant => {
            const owned = profile.ownedSeeds[plant.id] || 0
            const available = plant.seedCost === 0 || owned > 0
            return (
              <motion.button key={plant.id}
                onClick={() => available && setSelectedSeed(plant.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  selectedSeed === plant.id ? 'border-green-400 bg-green-50 text-green-700'
                  : available ? 'border-gray-200 bg-white text-gray-600 hover:border-green-200'
                  : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                whileTap={available ? { scale: 0.92 } : {}}>
                <span>{plant.emoji}</span>
                <span className="hidden sm:inline text-xs">{plant.name}</span>
                {plant.seedCost > 0 && (
                  <span className={`text-xs ${owned > 0 ? 'text-green-500' : 'text-gray-300'}`}>×{owned}</span>
                )}
              </motion.button>
            )
          })}
        </div>
        <motion.button onClick={() => setShowShop(true)}
          className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold text-base py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-3"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <ShoppingBag size={20} /> Open Shop
          <span className="text-sm font-semibold opacity-80">🌸 {profile.petals.toLocaleString()}</span>
        </motion.button>
        <p className="text-center text-xs text-white/70 font-semibold drop-shadow">
          WASD to move · A/D to turn · Click a plot to plant or harvest
        </p>
      </div>
    </div>
  )
}
