import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, X, User, LogOut, Shirt, Home, Tv, MessageSquare, Sword, Heart } from 'lucide-react'
import Garden3D from './Garden3D'
import { PLANTS, DEFAULT_UNLOCKED, DEFAULT_OWNED_SEEDS } from './plants'

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_ITEMS = {
  waterer: {
    id: 'waterer', name: 'Auto Waterer', emoji: '💧',
    description: 'Auto-harvests ready plots (uses charges).',
    baseCost: 50, maxCount: 10,
  },
  fertilizer: {
    id: 'fertilizer', name: 'Fertilizer', emoji: '✨',
    description: 'Next plant grows 2× faster!',
    baseCost: 25, maxCount: 99,
  },
  plot_expansion: {
    id: 'plot_expansion', name: 'Expand Farm East', emoji: '🪴',
    description: 'Adds a new column of 5 plots to the east side of your farm!',
    baseCost: 80, maxCount: 15,
  },
  refill_charges: {
    id: 'refill_charges', name: 'Refill Charges', emoji: '🔋',
    description: 'Add 50 auto-harvest charges.',
    baseCost: 150, maxCount: 999,
  },
}

const HOUSE_UPGRADES = [
  { level: 1, name: 'Greenhouse',    emoji: '🪟', cost: 500,  description: 'Plants grow 10% faster.' },
  { level: 2, name: 'Tool Shed',     emoji: '🔧', cost: 1500, description: 'Unlocks premium tools in the wardrobe.' },
  { level: 3, name: 'Storage Vault', emoji: '📦', cost: 3000, description: 'Auto Waterer gives +30 charges (instead of 20).' },
  { level: 4, name: 'Grand Estate',  emoji: '🏰', cost: 7500, description: 'All plants yield 25% more petals.' },
]

const WARDROBE = {
  shirts: [
    { id: 'shirt_default', name: 'White Tee',     color: '#f5f5f5', cost: 0   },
    { id: 'shirt_green',   name: 'Green Shirt',   color: '#4ade80', cost: 50  },
    { id: 'shirt_blue',    name: 'Blue Shirt',    color: '#60a5fa', cost: 50  },
    { id: 'shirt_red',     name: 'Red Shirt',     color: '#f87171', cost: 50  },
    { id: 'shirt_teal',    name: 'Teal Shirt',    color: '#2dd4bf', cost: 50  },
    { id: 'shirt_orange',  name: 'Orange Shirt',  color: '#f97316', cost: 50  },
    { id: 'shirt_pink',    name: 'Pink Shirt',    color: '#ec4899', cost: 75  },
    { id: 'shirt_purple',  name: 'Purple Shirt',  color: '#c084fc', cost: 100 },
    { id: 'shirt_lime',    name: 'Lime Shirt',    color: '#84cc16', cost: 100 },
    { id: 'shirt_navy',    name: 'Navy Shirt',    color: '#1e3a8a', cost: 150 },
    { id: 'shirt_black',   name: 'Black Shirt',   color: '#111827', cost: 150 },
    { id: 'shirt_gold',    name: 'Gold Shirt',    color: '#fbbf24', cost: 200 },
  ],
  pants: [
    { id: 'pants_default', name: 'Brown Pants',   color: '#92400e', cost: 0   },
    { id: 'pants_blue',    name: 'Blue Jeans',    color: '#1d4ed8', cost: 50  },
    { id: 'pants_black',   name: 'Black Pants',   color: '#1f2937', cost: 50  },
    { id: 'pants_gray',    name: 'Gray Pants',    color: '#6b7280', cost: 50  },
    { id: 'pants_khaki',   name: 'Khaki Pants',   color: '#c2a97a', cost: 75  },
    { id: 'pants_red',     name: 'Red Pants',     color: '#dc2626', cost: 75  },
    { id: 'pants_green',   name: 'Green Pants',   color: '#166534', cost: 100 },
    { id: 'pants_teal',    name: 'Teal Pants',    color: '#0d9488', cost: 100 },
    { id: 'pants_purple',  name: 'Purple Pants',  color: '#7e22ce', cost: 100 },
    { id: 'pants_white',   name: 'White Pants',   color: '#f9fafb', cost: 150 },
  ],
  hats: [
    { id: 'hat_none',      name: 'No Hat',        hatColor: null,      hatBrim: false, cost: 0   },
    { id: 'hat_straw',     name: 'Straw Hat',     hatColor: '#d97706', hatBrim: true,  cost: 75  },
    { id: 'hat_blue',      name: 'Blue Cap',      hatColor: '#2563eb', hatBrim: false, cost: 75  },
    { id: 'hat_red',       name: 'Red Cap',       hatColor: '#dc2626', hatBrim: false, cost: 75  },
    { id: 'hat_pink',      name: 'Pink Cap',      hatColor: '#ec4899', hatBrim: false, cost: 75  },
    { id: 'hat_green',     name: 'Green Cap',     hatColor: '#16a34a', hatBrim: false, cost: 75  },
    { id: 'hat_hard',      name: 'Hard Hat',      hatColor: '#fbbf24', hatBrim: false, cost: 100 },
    { id: 'hat_fancy',     name: 'Fancy Hat',     hatColor: '#7c3aed', hatBrim: true,  cost: 150 },
    { id: 'hat_santa',     name: 'Santa Hat',     hatColor: '#dc2626', hatBrim: false, cost: 150 },
    { id: 'hat_wizard',    name: 'Wizard Hat',    hatColor: '#4c1d95', hatBrim: true,  cost: 250 },
    { id: 'hat_golden',    name: 'Golden Crown',  hatColor: '#f59e0b', hatBrim: true,  cost: 300 },
  ],
  tools: [
    { id: 'shovel',        name: 'Shovel',        emoji: '🪛', cost: 0,    houseReq: 0 },
    { id: 'watering_can',  name: 'Watering Can',  emoji: '🪣', cost: 100,  houseReq: 0 },
    { id: 'pitchfork',     name: 'Pitchfork',     emoji: '🌾', cost: 150,  houseReq: 0 },
    { id: 'hoe',           name: 'Hoe',           emoji: '⚒️', cost: 200,  houseReq: 0 },
    { id: 'golden_shovel', name: 'Golden Shovel', emoji: '✨', cost: 500,  houseReq: 2 },
    { id: 'magic_wand',    name: 'Magic Wand',    emoji: '🪄', cost: 1000, houseReq: 2 },
  ],
}

// ─── Combat & castle shop constants ──────────────────────────────────────────
const WEAPONS_SHOP = [
  { id: 'wooden_sword',  name: 'Wooden Sword',  emoji: '🗡️', damage: 1,  range: 0,  cost: 100,        killsRequired: 0   },
  { id: 'iron_sword',    name: 'Iron Sword',    emoji: '⚔️',  damage: 2,  range: 0,  cost: 500,        killsRequired: 3   },
  { id: 'golden_sword',  name: 'Golden Sword',  emoji: '✨',  damage: 3,  range: 0,  cost: 2000,       killsRequired: 8   },
  { id: 'crystal_sword', name: 'Crystal Sword', emoji: '💎', damage: 5,  range: 0,  cost: 8000,       killsRequired: 15  },
  { id: 'dragon_sword',  name: 'Dragon Sword',  emoji: '🔥', damage: 8,  range: 0,  cost: 30000,      killsRequired: 25  },
  { id: 'void_sword',    name: 'Void Sword',    emoji: '🌑', damage: 12, range: 0,  cost: 120000,     killsRequired: 40  },
  { id: 'titan_sword',   name: 'Titan Sword',   emoji: '⚡', damage: 18, range: 0,  cost: 0,          killsRequired: 60,  diamondCost: 75  },
  { id: 'godly_sword',   name: 'Godly Sword',   emoji: '🌠', damage: 25, range: 0,  cost: 0,          killsRequired: 85,  diamondCost: 250 },
  { id: 'mythic_sword',  name: 'Mythic Sword',  emoji: '🌟', damage: 35, range: 0,  cost: 0,          killsRequired: 120, diamondCost: 600 },
  { id: 'wooden_bow',    name: 'Wooden Bow',    emoji: '🏹', damage: 2,  range: 6,  cost: 200,        killsRequired: 2   },
  { id: 'iron_bow',      name: 'Iron Bow',      emoji: '🎯', damage: 3,  range: 8,  cost: 1000,       killsRequired: 7   },
  { id: 'golden_bow',    name: 'Golden Bow',    emoji: '💛', damage: 5,  range: 10, cost: 6000,       killsRequired: 18  },
  { id: 'crystal_bow',   name: 'Crystal Bow',   emoji: '💠', damage: 8,  range: 12, cost: 40000,      killsRequired: 35  },
  { id: 'dragon_bow',    name: 'Dragon Bow',    emoji: '🐉', damage: 12, range: 14, cost: 200000,     killsRequired: 55  },
  { id: 'titan_bow',     name: 'Titan Bow',     emoji: '⚡', damage: 18, range: 17, cost: 0,          killsRequired: 80,  diamondCost: 80  },
  { id: 'mythic_bow',    name: 'Mythic Bow',    emoji: '🌟', damage: 28, range: 20, cost: 0,          killsRequired: 120, diamondCost: 400 },
]
const ARMOUR_SHOP = [
  { id: 'leather_armour', name: 'Leather Armour', emoji: '🛡️', defense: 1,  cost: 150,     killsRequired: 2   },
  { id: 'iron_armour',    name: 'Iron Armour',    emoji: '🔩',  defense: 2,  cost: 800,     killsRequired: 5,   woodCost: 15  },
  { id: 'golden_armour',  name: 'Golden Armour',  emoji: '🌟', defense: 3,  cost: 3000,    killsRequired: 10,  woodCost: 40  },
  { id: 'crystal_armour', name: 'Crystal Armour', emoji: '💎', defense: 5,  cost: 12000,   killsRequired: 18,  woodCost: 100 },
  { id: 'dragon_armour',  name: 'Dragon Armour',  emoji: '🐉', defense: 8,  cost: 60000,   killsRequired: 30,  woodCost: 250 },
  { id: 'titan_armour',   name: 'Titan Armour',   emoji: '⚡', defense: 12, cost: 300000,  killsRequired: 50,  woodCost: 500 },
  { id: 'void_armour',    name: 'Void Armour',    emoji: '🌑', defense: 18, cost: 0,       killsRequired: 75,  diamondCost: 50  },
  { id: 'godly_armour',   name: 'Godly Armour',   emoji: '🌠', defense: 25, cost: 0,       killsRequired: 100, diamondCost: 200 },
  { id: 'mythic_armour',  name: 'Mythic Armour',  emoji: '✨', defense: 35, cost: 0,       killsRequired: 130, diamondCost: 500 },
]
const POTIONS_SHOP = [
  { id: 'small_potion',  name: 'Small Potion',  emoji: '🧪', hp: 3,  cost: 50  },
  { id: 'medium_potion', name: 'Medium Potion', emoji: '⚗️',  hp: 5,  cost: 100 },
  { id: 'large_potion',  name: 'Large Potion',  emoji: '🫙', hp: 10, cost: 200 },
]
const AXES_SHOP = [
  { id: 'wooden_axe',  name: 'Wooden Axe',  emoji: '🪓', chopDamage: 1,   cost: 80,       killsRequired: 0   },
  { id: 'iron_axe',    name: 'Iron Axe',    emoji: '⛏️',  chopDamage: 2,   cost: 400,      killsRequired: 3,   woodCost: 10  },
  { id: 'steel_axe',   name: 'Steel Axe',   emoji: '🔱',  chopDamage: 4,   cost: 1500,     killsRequired: 8,   woodCost: 30  },
  { id: 'golden_axe',  name: 'Golden Axe',  emoji: '✨', chopDamage: 7,   cost: 8000,     killsRequired: 18,  woodCost: 80  },
  { id: 'crystal_axe', name: 'Crystal Axe', emoji: '💎', chopDamage: 12,  cost: 40000,    killsRequired: 35,  woodCost: 200 },
  { id: 'dragon_axe',  name: 'Dragon Axe',  emoji: '🐉', chopDamage: 20,  cost: 200000,   killsRequired: 55,  woodCost: 400 },
  { id: 'titan_axe',   name: 'Titan Axe',   emoji: '⚡', chopDamage: 35,  cost: 0,        killsRequired: 80,  diamondCost: 100 },
  { id: 'mythic_axe',  name: 'Mythic Axe',  emoji: '🌟', chopDamage: 60,  cost: 0,        killsRequired: 120, diamondCost: 300 },
  { id: 'legend_axe',  name: 'Legend Axe',  emoji: '👑', chopDamage: 100, cost: 0,        killsRequired: 150, diamondCost: 800 },
]
const SAWMILL_UPGRADES = [
  { id: 'sawmill_1',  name: 'Basic Sawmill',    emoji: '🪚', cost: 500,    woodMult: 1.5,  description: '1.5× wood income.'   },
  { id: 'sawmill_2',  name: 'Iron Sawmill',     emoji: '⚙️',  cost: 1500,   woodMult: 2.0,  description: '2× wood income.'     },
  { id: 'sawmill_3',  name: 'Master Sawmill',   emoji: '🏭', cost: 4000,   woodMult: 3.0,  description: '3× wood income.'     },
  { id: 'sawmill_4',  name: 'Alloy Sawmill',    emoji: '⚒️',  cost: 8000,   woodMult: 5.0,  description: '5× wood income.'     },
  { id: 'sawmill_5',  name: 'Steel Sawmill',    emoji: '🔧', cost: 18000,  woodMult: 8.0,  description: '8× wood income.'     },
  { id: 'sawmill_6',  name: 'Diamond Saw',      emoji: '💎', cost: 40000,  woodMult: 12.0, description: '12× wood income.'    },
  { id: 'sawmill_7',  name: 'Turbo Sawmill',    emoji: '⚡', cost: 80000,  woodMult: 20.0, description: '20× wood income.'    },
  { id: 'sawmill_8',  name: 'Quantum Saw',      emoji: '🔬', cost: 0,      woodMult: 35.0, description: '35× wood income.',   diamondCost: 30  },
  { id: 'sawmill_9',  name: 'Plasma Sawmill',   emoji: '🌟', cost: 0,      woodMult: 60.0, description: '60× wood income.',   diamondCost: 80  },
  { id: 'sawmill_10', name: 'Legendary Saw',    emoji: '👑', cost: 0,      woodMult: 100.0,description: '100× wood income.',  diamondCost: 200 },
]

// ─── Permanent fertilizer upgrade tiers ──────────────────────────────────────
const FERTILIZER_UPGRADES = [
  { id: 'fert_1',  name: 'Bone Meal',       emoji: '🦴', cost: 200,    speedMult: 1.5,  description: '1.5× grow speed (100 plants per charge).' },
  { id: 'fert_2',  name: 'Compost Mix',     emoji: '🌿', cost: 500,    speedMult: 2.0,  description: '2× grow speed (100 plants per charge).'   },
  { id: 'fert_3',  name: 'Growth Serum',    emoji: '🧪', cost: 1500,   speedMult: 3.0,  description: '3× grow speed (100 plants per charge).'   },
  { id: 'fert_4',  name: 'Super Grow',      emoji: '⚗️',  cost: 4000,   speedMult: 5.0,  description: '5× grow speed (100 plants per charge).'   },
  { id: 'fert_5',  name: 'Turbo Bloom',     emoji: '🌸', cost: 10000,  speedMult: 8.0,  description: '8× grow speed (100 plants per charge).'   },
  { id: 'fert_6',  name: 'Magic Compost',   emoji: '✨', cost: 25000,  speedMult: 12.0, description: '12× grow speed (100 plants per charge).'  },
  { id: 'fert_7',  name: 'Hyper Growth',    emoji: '🌱', cost: 60000,  speedMult: 20.0, description: '20× grow speed (100 plants per charge).'  },
  { id: 'fert_8',  name: 'Time Warp Mix',   emoji: '⏰', cost: 0,      speedMult: 35.0, description: '35× grow speed (100 plants).',        diamondCost: 25  },
  { id: 'fert_9',  name: 'Quantum Feed',    emoji: '🔬', cost: 0,      speedMult: 60.0, description: '60× grow speed (100 plants).',        diamondCost: 70  },
  { id: 'fert_10', name: 'Legend Brew',     emoji: '👑', cost: 0,      speedMult: 100.0,description: '100× grow speed (100 plants).',       diamondCost: 180 },
]
const TREE_BASE_WOOD = 5   // wood per tree chop

const DIAMOND_PACKS = [
  { id: 'pack_sm',  name: 'Small Pouch',  emoji: '💎', amount: 500,   price: '$0.99'  },
  { id: 'pack_md',  name: 'Medium Chest', emoji: '💎', amount: 2500,  price: '$3.99'  },
  { id: 'pack_lg',  name: 'Large Vault',  emoji: '💎', amount: 7500,  price: '$9.99'  },
  { id: 'pack_xl',  name: 'Mega Hoard',   emoji: '💎', amount: 25000, price: '$24.99' },
]

const DAY_SECONDS   = 5 * 60   // 5 minutes
const NIGHT_SECONDS = 2 * 60   // 2 minutes

const CASTLE_UPGRADES = [
  { id: 'wall_stone',  name: 'Stone Walls',     emoji: '🏰', cost: 1000,  requires: null,         description: 'Stronger walls slowed zombies.' },
  { id: 'wall_iron',   name: 'Iron Reinforced', emoji: '⛓️', cost: 3000,  requires: 'wall_stone',  description: 'Heavy iron plating keeps zombies out.' },
  { id: 'archers',     name: 'Add Archers',     emoji: '🏹', cost: 2000,  requires: null,         description: 'Builds watchtowers. Archers deal 2 dmg every 5s.' },
  { id: 'archers_2',   name: 'Veteran Archers', emoji: '🎯', cost: 5000,  requires: 'archers',    description: 'Upgrade: 3 dmg every 4s per tower.' },
  { id: 'archers_3',   name: 'Expert Archers',  emoji: '⚡', cost: 12000, requires: 'archers_2',  description: 'Upgrade: 5 dmg every 3s per tower.' },
  { id: 'archers_4',   name: 'Elite Archers',   emoji: '👑', cost: 30000, requires: 'archers_3',  description: 'Upgrade: 7 dmg every 2s per tower.' },
  { id: 'watchtower',  name: 'Watchtower',      emoji: '🗼', cost: 5000,  requires: null,         description: 'See zombies from afar.' },
]

const DEFAULT_OUTFIT = {
  shirtColor: '#f5f5f5',
  pantsColor: '#92400e',
  hatColor: null,
  hatBrim: false,
  toolId: 'shovel',
}

const DEFAULT_WARDROBE_OWNED = {
  shirt_default: true,
  pants_default: true,
  hat_none: true,
  shovel: true,
}

// ─── Music tracks ─────────────────────────────────────────────────────────────
// Developers: drop .wav/.mp3 files in public/music/ and add entries here.
const MUSIC_TRACKS = [
  { title: 'Peaceful Garden', src: '/music/peaceful_garden.wav' },
  { title: 'Farm Life',       src: '/music/farm_life.wav'       },
  { title: 'Night Sounds',    src: '/music/night_sounds.wav'    },
]

// ─── Sound ────────────────────────────────────────────────────────────────────
function playCrunchSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const duration = 0.10
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 55) * 0.45
    }
    const src  = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = 0.08
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
    src.onended = () => ctx.close()
  } catch {}
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
let apiAvailable = null

async function checkApi() {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(1500) })
    apiAvailable = r.ok
  } catch { apiAvailable = false }
  return apiAvailable
}

async function apiCheckUser(username) {
  try {
    const r = await fetch(`${API}/check/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(2000) })
    if (!r.ok) return null
    return await r.json()   // { exists, hasPassword }
  } catch { return null }
}

async function apiRegister(username, password, profile) {
  try {
    const r = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, profile }),
      signal: AbortSignal.timeout(5000),
    })
    return await r.json()
  } catch { return null }
}

async function apiLoginUser(username, password) {
  try {
    const r = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(5000),
    })
    return await r.json()
  } catch { return null }
}

async function apiFeedback(username, message) {
  try {
    await fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, message }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {}
}

async function apiSave(username, profile) {
  try {
    await fetch(`${API}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, profile }),
      signal: AbortSignal.timeout(3000),
    })
  } catch { /* silent fallback */ }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'growagarden_v4'

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
  data.ownedSeeds   = { ...DEFAULT_OWNED_SEEDS, ...(data.ownedSeeds || {}) }
  if (!data.unlockedPlants)  data.unlockedPlants  = ['daisy']
  if (!data.outfit)          data.outfit          = { ...DEFAULT_OUTFIT }
  if (!data.wardrobeOwned)   data.wardrobeOwned   = { ...DEFAULT_WARDROBE_OWNED }
  if (data.autoHarvestCharges == null) data.autoHarvestCharges = 0
  if (data.houseLevel        == null) data.houseLevel        = 0
  if (data.lastAdTime        == null) data.lastAdTime        = 0
  if (data.dayCount          == null) data.dayCount          = 1
  if (!data.ownedWeapons)    data.ownedWeapons    = {}
  if (!data.ownedArmour)     data.ownedArmour     = {}
  if (data.equippedWeapon    == null) data.equippedWeapon    = null
  if (data.equippedArmour    == null) data.equippedArmour    = null
  if (data.zombieKills       == null) data.zombieKills       = 0
  if (!data.castleUpgrades)          data.castleUpgrades     = {}
  if (!data.ownedAxes)               data.ownedAxes           = {}
  if (data.equippedAxe        == null) data.equippedAxe       = null
  if (!data.sawmillUpgrades)         data.sawmillUpgrades     = {}
  if (data.fertilizerTier    == null) data.fertilizerTier     = 0
  if (data.fertilizerCharges == null) data.fertilizerCharges  = 0
  if (data.wood              == null) data.wood               = 0
  if (data.diamonds          == null) data.diamonds           = 0
  if (!data.gameMode)                data.gameMode            = 'regular'
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
    autoHarvestCharges: 0,
    houseLevel: 0,
    lastAdTime: 0,
    dayCount: 1,
    ownedWeapons: {},
    ownedArmour: {},
    equippedWeapon: null,
    equippedArmour: null,
    zombieKills: 0,
    castleUpgrades: {},
    ownedAxes: {},
    equippedAxe: null,
    sawmillUpgrades: {},
    fertilizerTier: 0,
    fertilizerCharges: 0,
    wood: 0,
    diamonds: 0,
    gameMode: 'regular',
    outfit: { ...DEFAULT_OUTFIT },
    wardrobeOwned: { ...DEFAULT_WARDROBE_OWNED },
  }
}

// ─── Hardcore game over screen ────────────────────────────────────────────────
function HardcoreGameOverScreen({ days, kills, onDismiss }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-gray-900 border-2 border-red-700 rounded-3xl shadow-2xl w-full max-w-sm text-center p-8"
        initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 16 }}>
        <div className="text-6xl mb-3">💀</div>
        <h2 className="text-3xl font-extrabold text-red-400 mb-1">You Died</h2>
        <p className="text-gray-400 text-sm mb-6">All progress has been lost.</p>
        <div className="space-y-3 mb-8">
          <div className="bg-gray-800 rounded-2xl px-5 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm font-semibold">📅 Days Survived</span>
            <span className="text-white font-extrabold text-lg">{days}</span>
          </div>
          <div className="bg-gray-800 rounded-2xl px-5 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm font-semibold">🧟 Zombies Killed</span>
            <span className="text-white font-extrabold text-lg">{kills}</span>
          </div>
        </div>
        <motion.button onClick={onDismiss}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl py-3 shadow-lg"
          whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
          Try Again 💀
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ─── Login overlay ────────────────────────────────────────────────────────────
function LoginOverlay({ onLogin }) {
  const [tab, setTab]           = useState('register') // 'login' | 'register'
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [mode, setMode]         = useState('regular') // 'regular' | 'hardcore'
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const inputCls = 'w-full border-2 border-green-200 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:border-green-400 transition-colors text-sm'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const u = name.trim()
    if (!u)       { setError('Please enter a username.'); return }
    if (!password){ setError('Please enter a password.'); return }
    if (tab === 'register') {
      if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
    }
    setError('')
    setLoading(true)
    const err = await onLogin(u, password, tab === 'register', mode)
    setLoading(false)
    if (err) { setError(err); return }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,rgba(240,253,244,.98),rgba(254,252,232,.98) 50%,rgba(252,231,243,.98))' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18 }}>
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-8">
          <motion.div className="text-6xl mb-3"
            animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>🌸</motion.div>
          <h1 className="text-3xl font-extrabold text-green-700">Grow a Garden</h1>
          <p className="text-gray-400 text-sm mt-1">A cozy little flower farm</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mx-4">
          {['register','login'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab===t?'text-green-600 border-b-2 border-green-400':'text-gray-400 hover:text-gray-600'}`}>
              {t === 'register' ? '🌱 New Account' : '🔑 Log In'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-green-700 mb-1">Username</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Lily, Blossom…" maxLength={20} className={inputCls}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 4 characters" maxLength={50} className={inputCls}/>
          </div>
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-green-700 mb-1">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" maxLength={50} className={inputCls}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-green-700 mb-1">Game Mode</label>
                <div className="flex gap-2">
                  {['regular', 'hardcore', 'peaceful'].map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                        mode === m
                          ? m === 'hardcore' ? 'bg-red-500 text-white border-red-500'
                            : m === 'peaceful' ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>
                      {m === 'regular' ? '🌿 Regular' : m === 'hardcore' ? '💀 Hardcore' : '🕊️ Peaceful'}
                    </button>
                  ))}
                </div>
                {mode === 'hardcore' && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    On death: all progress is lost and you restart from Day 1.
                  </p>
                )}
                {mode === 'peaceful' && (
                  <p className="text-xs text-blue-500 mt-1 font-medium">
                    No zombies. Just farming and exploring! 🌻
                  </p>
                )}
              </div>
            </>
          )}
          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}
          <motion.button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-xl py-3 mt-1 disabled:opacity-40 shadow-md"
            whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
            {loading ? 'Loading…' : tab === 'login' ? 'Log In 🌸' : 'Create Account 🌱'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Shop panel ───────────────────────────────────────────────────────────────
function ShopPanel({ profile, onBuySeed, onUnlock, onBuyItem, onBuyFertUpgrade, onClose }) {
  const [tab, setTab] = useState('seeds')
  const [tierFilter, setTierFilter] = useState(0)
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)

  const plantList = Object.values(PLANTS)
  const filtered  = plantList.filter(p => {
    if (tierFilter && p.tier !== tierFilter) return false
    if (showUnlockedOnly && !(profile.unlockedPlants || []).includes(p.id)) return false
    return true
  })

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
        initial={{ y: 60, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-green-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Garden Shop</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-3 py-1.5">
              <span>💰</span><span className="font-bold text-yellow-600">{profile.petals.toLocaleString()}</span>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {['seeds', 'upgrades'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold capitalize ${tab === t ? 'text-green-600 border-b-2 border-green-400' : 'text-gray-400'}`}>
              {t === 'seeds' ? '🌱 Plants (100)' : '⚡ Upgrades'}
            </button>
          ))}
        </div>

        {tab === 'seeds' && (
          <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
            {[0, 1, 2, 3, 4, 5].map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${tierFilter === t ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t === 0 ? 'All' : ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][t]}
              </button>
            ))}
            <button onClick={() => setShowUnlockedOnly(v => !v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${showUnlockedOnly ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              🔓 Unlocked
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {tab === 'seeds' && filtered.map(plant => {
            const owned        = profile.ownedSeeds[plant.id] || 0
            const isUnlocked   = (profile.unlockedPlants || []).includes(plant.id)
            const isDiamondSeed = !!plant.diamondUnlockCost
            const canAffordUnlock = isDiamondSeed
              ? (profile.diamonds || 0) >= plant.diamondUnlockCost
              : profile.petals >= plant.unlockCost
            const canAffordSeeds  = profile.petals >= plant.seedCost
            const isFree       = plant.seedCost === 0
            return (
              <motion.div key={plant.id} whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${isDiamondSeed && !isUnlocked ? 'border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50' : `${plant.border} bg-gradient-to-r ${plant.color}`} ${!isUnlocked ? 'opacity-80' : ''}`}>
                <span className="text-2xl">{plant.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-800 text-sm">{plant.name}</span>
                    <span className="text-xs bg-white/60 rounded-full px-1.5 py-0.5 text-gray-500 font-semibold">{plant.label}</span>
                    {!isUnlocked && <span className="text-xs">🔒</span>}
                    {isDiamondSeed && !isUnlocked && <span className="text-xs bg-cyan-100 text-cyan-700 rounded-full px-1.5 py-0.5 font-bold">💎 Diamond</span>}
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
                        {isFree ? 'Free' : `💰 ${plant.seedCost.toLocaleString()}`}
                      </motion.button>
                    </>
                  ) : (
                    <motion.button onClick={() => onUnlock(plant.id)}
                      disabled={!canAffordUnlock}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl ${canAffordUnlock ? (isDiamondSeed ? 'bg-cyan-500 text-white shadow' : 'bg-green-500 text-white shadow hover:shadow-md') : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      whileTap={canAffordUnlock ? { scale: 0.9 } : {}}>
                      {isDiamondSeed ? `💎 ${plant.diamondUnlockCost}` : `Unlock 💰 ${plant.unlockCost.toLocaleString()}`}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}

          {tab === 'upgrades' && (
            <>
              {Object.values(SHOP_ITEMS).map(item => {
                const count = item.id === 'waterer'       ? profile.waterers
                            : item.id === 'fertilizer'    ? (profile.hasFertilizer ? 1 : 0)
                            : item.id === 'plot_expansion' ? (profile.extraRows || 0)
                            : 0
                const cost  = item.id === 'plot_expansion'
                  ? item.baseCost * (1 + (profile.extraRows || 0)) : item.baseCost
                const canAfford = profile.petals >= cost
                const maxed     = item.id !== 'refill_charges' && count >= item.maxCount
                return (
                  <motion.div key={item.id} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                      {item.id === 'waterer' && <div className="text-xs text-blue-500 mt-0.5">{count} / {item.maxCount} · {profile.autoHarvestCharges} charges left</div>}
                      {item.id === 'plot_expansion' && <div className="text-xs text-blue-500 mt-0.5">{count} / {item.maxCount}</div>}
                    </div>
                    <motion.button onClick={() => onBuyItem(item.id, cost)}
                      disabled={!canAfford || maxed}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl ${maxed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : canAfford ? 'bg-white text-gray-700 shadow hover:shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      whileTap={canAfford && !maxed ? { scale: 0.9 } : {}}>
                      {maxed ? 'Max' : `💰 ${cost.toLocaleString()}`}
                    </motion.button>
                  </motion.div>
                )
              })}

              {/* ── Fertilizer Upgrades (redesigned: unlock then recharge 100 plants) ── */}
              <div className="mt-3 mb-1 px-1">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">🌿 Fertilizer</p>
                {(profile.fertilizerTier || 0) > 0 && (
                  <p className="text-xs text-green-500 mt-0.5">
                    Active: {FERTILIZER_UPGRADES[(profile.fertilizerTier||1)-1]?.speedMult}× speed · {profile.fertilizerCharges || 0} plants left
                  </p>
                )}
              </div>
              {FERTILIZER_UPGRADES.map((upgrade, idx) => {
                const currentTier = profile.fertilizerTier || 0
                const isUnlocked  = currentTier > idx
                const isActive    = currentTier === idx + 1
                const isNext      = currentTier === idx
                const hasDiamond  = !!upgrade.diamondCost
                // task 4 (file): lower non-diamond tiers are locked once a higher one is bought
                const isSuperseded = !hasDiamond && isUnlocked && currentTier > idx + 1
                const isLocked    = (idx > currentTier) || isSuperseded
                const canAffordGold    = !hasDiamond && profile.petals >= upgrade.cost
                const canAffordDiamond = hasDiamond && (profile.diamonds || 0) >= upgrade.diamondCost
                const canAfford        = hasDiamond ? canAffordDiamond : canAffordGold
                const chargesLeft = isActive ? (profile.fertilizerCharges || 0) : 0
                const isClickable = (isNext || (isUnlocked && !isSuperseded)) && canAfford
                return (
                  <motion.div key={upgrade.id} whileTap={isClickable ? { scale: 0.98 } : {}}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${isActive ? 'border-lime-300 bg-lime-50' : isSuperseded ? 'border-gray-100 bg-gray-50 opacity-40' : isUnlocked ? 'border-green-200 bg-green-50' : isNext ? 'border-lime-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <span className="text-3xl">{upgrade.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm">{upgrade.name}</div>
                      <div className="text-xs text-gray-500">{upgrade.description}</div>
                      {isActive && <div className="text-xs text-lime-600 font-bold mt-0.5">⚡ Active — {chargesLeft}/100 plants</div>}
                      {isSuperseded && <div className="text-xs text-gray-400 mt-0.5">Replaced by higher tier</div>}
                    </div>
                    <motion.button onClick={() => isClickable && onBuyFertUpgrade(idx)}
                      disabled={isLocked || !canAfford}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 ${isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : isClickable ? (hasDiamond ? 'bg-cyan-500 text-white shadow' : 'bg-lime-500 text-white shadow hover:bg-lime-600') : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      whileTap={isClickable ? { scale: 0.9 } : {}}>
                      {isLocked ? '🔒' : hasDiamond ? `💎 ${upgrade.diamondCost}` : isNext ? `Unlock 💰 ${upgrade.cost.toLocaleString()}` : `+100 💰 ${Math.floor(upgrade.cost * 0.4).toLocaleString()}`}
                    </motion.button>
                  </motion.div>
                )
              })}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Stats / profile panel ────────────────────────────────────────────────────
function StatsPanel({ profile, onClose, onLogout }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-800">Your Garden</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {[
            { bg: 'bg-yellow-50', icon: '💰', label: 'GOLD BALANCE',         val: profile.petals.toLocaleString(),         color: 'text-yellow-600' },
            { bg: 'bg-green-50',  icon: '🌾', label: 'TOTAL HARVESTED',     val: profile.totalHarvested.toLocaleString(),  color: 'text-green-600'  },
            { bg: 'bg-blue-50',   icon: '💧', label: 'AUTO WATERERS',       val: `${profile.waterers} (${profile.autoHarvestCharges} charges)`, color: 'text-blue-600' },
            { bg: 'bg-amber-50',  icon: '🏠', label: 'HOUSE LEVEL',         val: profile.houseLevel === 0 ? 'None' : HOUSE_UPGRADES[profile.houseLevel - 1]?.name, color: 'text-amber-600' },
            { bg: 'bg-purple-50', icon: '🪴', label: 'PLOT ROWS',           val: 5 + (profile.extraRows || 0),             color: 'text-purple-600' },
            { bg: 'bg-pink-50',   icon: '🌱', label: 'PLANTS UNLOCKED',     val: (profile.unlockedPlants || []).length,    color: 'text-pink-600'   },
            { bg: 'bg-sky-50',    icon: '📅', label: 'DAYS SURVIVED',        val: profile.dayCount || 1,                    color: 'text-sky-600'    },
            { bg: 'bg-red-50',    icon: '⚔️',  label: 'WEAPON',               val: profile.equippedWeapon ? WEAPONS_SHOP.find(w=>w.id===profile.equippedWeapon)?.name || 'None' : 'None', color: 'text-red-600' },
            { bg: 'bg-orange-50', icon: '🧟', label: 'ZOMBIES SLAIN',        val: profile.zombieKills || 0,                 color: 'text-orange-600' },
          ].map(({ bg, icon, label, val, color }) => (
            <div key={label} className={`flex items-center gap-3 p-3 ${bg} rounded-2xl`}>
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="text-xs text-gray-400 font-semibold">{label}</div>
                <div className={`text-lg font-extrabold ${color}`}>{val}</div>
              </div>
            </div>
          ))}
        </div>
        <motion.button onClick={onLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl py-3 transition-colors"
          whileTap={{ scale: 0.97 }}>
          <LogOut size={16} /> Log Out
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ─── House panel ──────────────────────────────────────────────────────────────
function HousePanel({ profile, onUpgrade, onClose }) {
  const currentLevel = profile.houseLevel || 0
  const nextUpgrade  = HOUSE_UPGRADES[currentLevel]

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Home size={20} className="text-amber-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Your House</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="text-center mb-5">
          <div className="text-5xl mb-2">
            {currentLevel === 0 ? '🏚️' : currentLevel === 1 ? '🌿' : currentLevel === 2 ? '🔧' : currentLevel === 3 ? '📦' : '🏰'}
          </div>
          <div className="text-lg font-extrabold text-amber-700">
            {currentLevel === 0 ? 'Starter Shack' : HOUSE_UPGRADES[currentLevel - 1].name}
          </div>
          <div className="text-xs text-gray-400">Level {currentLevel} / {HOUSE_UPGRADES.length}</div>
        </div>

        {/* Active perks */}
        {currentLevel > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Perks</p>
            {HOUSE_UPGRADES.slice(0, currentLevel).map(u => (
              <div key={u.level} className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                <span>{u.emoji}</span>
                <span className="text-sm text-green-700 font-semibold">{u.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next upgrade */}
        {nextUpgrade ? (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Next Upgrade</p>
            <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{nextUpgrade.emoji}</span>
                <span className="font-extrabold text-amber-800">{nextUpgrade.name}</span>
              </div>
              <p className="text-sm text-amber-700 mb-3">{nextUpgrade.description}</p>
              <motion.button onClick={onUpgrade}
                disabled={profile.petals < nextUpgrade.cost}
                className={`w-full font-bold py-2.5 rounded-xl text-sm ${profile.petals >= nextUpgrade.cost ? 'bg-amber-500 text-white shadow hover:bg-amber-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                whileTap={profile.petals >= nextUpgrade.cost ? { scale: 0.97 } : {}}>
                Upgrade — 💰 {nextUpgrade.cost.toLocaleString()}
              </motion.button>
            </div>
          </>
        ) : (
          <div className="text-center text-green-600 font-bold py-4">✨ Fully upgraded!</div>
        )}

        {/* Future upgrades preview */}
        {nextUpgrade && HOUSE_UPGRADES.slice(currentLevel + 1).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coming Up</p>
            {HOUSE_UPGRADES.slice(currentLevel + 1).map(u => (
              <div key={u.level} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 opacity-60">
                <span>{u.emoji}</span>
                <span className="text-sm text-gray-500">{u.name} — 💰 {u.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Wardrobe panel ───────────────────────────────────────────────────────────
function WardrobePanel({ profile, onPurchase, onEquip, onClose }) {
  const [tab, setTab] = useState('shirts')
  const houseLevel    = profile.houseLevel || 0
  const owned         = profile.wardrobeOwned || {}
  const outfit        = profile.outfit || DEFAULT_OUTFIT

  const categories = [
    { key: 'shirts', label: '👕 Shirts',  items: WARDROBE.shirts },
    { key: 'pants',  label: '👖 Pants',   items: WARDROBE.pants  },
    { key: 'hats',   label: '🎩 Hats',    items: WARDROBE.hats   },
    { key: 'tools',  label: '🪛 Tools',   items: WARDROBE.tools  },
  ]

  const isEquipped = (item) => {
    if (tab === 'shirts') return outfit.shirtColor === item.color
    if (tab === 'pants')  return outfit.pantsColor === item.color
    if (tab === 'hats')   return outfit.hatColor   === item.hatColor
    if (tab === 'tools')  return outfit.toolId     === item.id
  }

  const handleItemClick = (item) => {
    const locked = tab === 'tools' && item.houseReq > 0 && houseLevel < item.houseReq
    if (locked) return
    if (!owned[item.id]) {
      onPurchase(tab, item)
    } else {
      onEquip(tab, item)
    }
  }

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[88vh] overflow-hidden flex flex-col"
        initial={{ y: 60, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shirt size={20} className="text-purple-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Wardrobe</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-3 py-1.5">
              <span>💰</span><span className="font-bold text-yellow-600">{profile.petals.toLocaleString()}</span>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        <div className="flex border-b border-gray-100 overflow-x-auto">
          {categories.map(c => (
            <button key={c.key} onClick={() => setTab(c.key)}
              className={`flex-shrink-0 flex-1 py-2.5 text-xs font-bold ${tab === c.key ? 'text-purple-600 border-b-2 border-purple-400' : 'text-gray-400'}`}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-3 grid grid-cols-2 gap-2">
          {(categories.find(c => c.key === tab)?.items || []).map(item => {
            const isOwned    = !!owned[item.id]
            const equipped   = isEquipped(item)
            const toolLocked = tab === 'tools' && item.houseReq > 0 && houseLevel < item.houseReq
            const canAfford  = profile.petals >= item.cost

            return (
              <motion.button key={item.id} onClick={() => handleItemClick(item)}
                disabled={toolLocked}
                whileTap={!toolLocked ? { scale: 0.95 } : {}}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  equipped    ? 'border-purple-400 bg-purple-50' :
                  isOwned     ? 'border-green-200 bg-green-50' :
                  toolLocked  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                                'border-gray-200 bg-white hover:border-purple-200'
                }`}>
                <div className="text-2xl mb-1">
                  {tab === 'tools' ? item.emoji :
                   tab === 'hats' && item.hatColor ? <span style={{ color: item.hatColor }}>🎩</span> :
                   tab === 'hats' ? '❌' :
                   <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: 6, background: item.color, border: '2px solid rgba(0,0,0,0.1)' }} />
                  }
                </div>
                <div className="text-xs font-bold text-gray-700 leading-tight">{item.name}</div>
                {toolLocked && <div className="text-xs text-orange-500 mt-0.5">🏠 Lvl {item.houseReq} req</div>}
                {!toolLocked && !isOwned && (
                  <div className={`text-xs mt-0.5 font-semibold ${canAfford ? 'text-green-600' : 'text-gray-400'}`}>
                    💰 {item.cost}
                  </div>
                )}
                {equipped && <div className="text-xs text-purple-600 font-bold mt-0.5">✓ Equipped</div>}
                {isOwned && !equipped && <div className="text-xs text-green-600 font-semibold mt-0.5">Owned</div>}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ad panel (task 2) ────────────────────────────────────────────────────────
function AdPanel({ onWatched, onClose }) {
  const [seconds, setSeconds]   = useState(5)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timer); setFinished(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const claim = () => { onWatched(); onClose() }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/80" />
      <motion.div className="relative bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="bg-gray-800 rounded-2xl p-8 mb-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📺</div>
            <div className="text-gray-300 text-sm">Your ad here</div>
            <div className="text-gray-500 text-xs mt-1">Support the garden!</div>
          </div>
        </div>
        <p className="text-white font-bold mb-1">🚀 2× Growth Speed Boost!</p>
        <p className="text-gray-400 text-xs mb-4">All currently growing plants will grow twice as fast.</p>
        {finished ? (
          <motion.button onClick={claim}
            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl"
            whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            Claim Boost 🌱
          </motion.button>
        ) : (
          <div className="text-gray-400 text-sm font-semibold">Please wait… {seconds}s</div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Feedback panel (task 3) ─────────────────────────────────────────────────
function FeedbackPanel({ onSubmit, onClose }) {
  const [text, setText]     = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]     = useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    await onSubmit(text.trim())
    setSending(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Send Feedback</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {done ? (
          <p className="text-center text-green-600 font-bold py-8">Thanks for your feedback! 💌</p>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={500}
              placeholder="Tell us what you think about the game…"
              className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:border-indigo-400 resize-none text-sm" />
            <div className="flex justify-between items-center mt-1 mb-3">
              <span className="text-xs text-gray-400">{text.length}/500</span>
            </div>
            <motion.button onClick={handleSend} disabled={!text.trim() || sending}
              className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl disabled:opacity-40"
              whileTap={{ scale: 0.97 }}>
              {sending ? 'Sending…' : 'Send Feedback 💌'}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Weapons & Armour panel ───────────────────────────────────────────────────
function WeaponsPanel({ profile, onBuyWeapon, onBuyArmour, onEquipWeapon, onEquipArmour, onBuyAxe, onEquipAxe, onClose }) {
  const [tab, setTab] = useState('weapons')
  const shopRow = (item, equipped, owned, locked, canAfford, onBuy, onEquip, statLabel) => {
    const hasDiamond = !!item.diamondCost
    const costLabel  = hasDiamond ? `💎 ${item.diamondCost}` : `💰 ${item.cost.toLocaleString()}`
    const hasWood    = !!item.woodCost
    return (
      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${equipped?'border-red-300 bg-red-50':locked?'border-gray-100 bg-gray-50':hasDiamond?'border-cyan-200 bg-cyan-50':'border-gray-200 bg-white'}`}>
        <span className="text-3xl">{item.emoji}</span>
        <div className="flex-1">
          <div className="font-bold text-gray-800">{item.name}</div>
          <div className="text-xs text-gray-500">{statLabel}</div>
          {hasWood && !owned && <div className="text-xs text-amber-600 mt-0.5">🪵 {item.woodCost} wood required</div>}
          {locked && <div className="text-xs text-orange-500 mt-0.5">Requires {item.killsRequired} kills</div>}
          {hasDiamond && !locked && !owned && <div className="text-xs text-cyan-600 mt-0.5">💎 Diamond item</div>}
        </div>
        <motion.button onClick={() => owned ? onEquip(item) : onBuy(item)}
          disabled={locked || (!owned && !canAfford)}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl ${equipped?'bg-red-100 text-red-700':locked?'bg-gray-100 text-gray-400 cursor-not-allowed':owned?'bg-gray-100 text-gray-700 hover:bg-gray-200':canAfford?(hasDiamond?'bg-cyan-500 text-white shadow':'bg-white border border-gray-200 shadow hover:shadow-md'):'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          whileTap={owned||(!locked&&canAfford)?{scale:0.9}:{}}>
          {equipped ? 'Equipped' : owned ? 'Equip' : locked ? 'Locked' : costLabel}
        </motion.button>
      </div>
    )
  }
  const swords = WEAPONS_SHOP.filter(w => w.range === 0)
  const bows   = WEAPONS_SHOP.filter(w => w.range > 0)
  return (
    <motion.div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[88vh] overflow-hidden flex flex-col"
        initial={{ y: 60, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sword size={20} className="text-red-500" />
            <h2 className="text-xl font-extrabold text-gray-800">Weapons & Axes</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-2.5 py-1.5">
              <span>💰</span><span className="font-bold text-yellow-600 text-sm">{profile.petals.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 rounded-xl px-2.5 py-1.5">
              <span>🪵</span><span className="font-bold text-amber-700 text-sm">{(profile.wood||0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 bg-cyan-50 rounded-xl px-2.5 py-1.5">
              <span>💎</span><span className="font-bold text-cyan-600 text-sm">{(profile.diamonds||0).toLocaleString()}</span>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {['weapons','armour','axes'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold ${tab===t?'text-red-600 border-b-2 border-red-400':'text-gray-400'}`}>
              {t === 'weapons' ? '⚔️ Weapons' : t === 'armour' ? '🛡️ Armour' : '🪓 Axes'}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {tab === 'weapons' && (
            <>
              <div className="px-1 py-1"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">⚔️ Swords</p></div>
              {swords.map(item => {
                const owned  = !!(profile.ownedWeapons || {})[item.id]
                const kills  = (profile.zombieKills || 0)
                const locked = !owned && kills < (item.killsRequired || 0)
                const canAfford = item.diamondCost ? (profile.diamonds||0) >= item.diamondCost : profile.petals >= item.cost
                return shopRow(item, profile.equippedWeapon === item.id, owned, locked, canAfford, onBuyWeapon, onEquipWeapon, `⚔️ +${item.damage} dmg`)
              })}
              <div className="px-1 pt-2 pb-1"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">🏹 Bows</p></div>
              {bows.map(item => {
                const owned  = !!(profile.ownedWeapons || {})[item.id]
                const kills  = (profile.zombieKills || 0)
                const locked = !owned && kills < (item.killsRequired || 0)
                const canAfford = item.diamondCost ? (profile.diamonds||0) >= item.diamondCost : profile.petals >= item.cost
                return shopRow(item, profile.equippedWeapon === item.id, owned, locked, canAfford, onBuyWeapon, onEquipWeapon, `🏹 +${item.damage} dmg · range ${item.range}`)
              })}
            </>
          )}
          {tab === 'armour' && ARMOUR_SHOP.map(item => {
            const owned = !!(profile.ownedArmour || {})[item.id]
            const locked = !owned && (profile.zombieKills || 0) < (item.killsRequired || 0)
            const woodOk = !item.woodCost || (profile.wood||0) >= item.woodCost
            const canAfford = woodOk && (item.diamondCost ? (profile.diamonds||0) >= item.diamondCost : profile.petals >= item.cost)
            return shopRow(item, profile.equippedArmour === item.id, owned, locked, canAfford, onBuyArmour, onEquipArmour, `🛡️ +${item.defense} def`)
          })}
          {tab === 'axes' && AXES_SHOP.map(item => {
            const owned = !!(profile.ownedAxes || {})[item.id]
            const locked = !owned && (profile.zombieKills || 0) < (item.killsRequired || 0)
            const woodOk = !item.woodCost || (profile.wood||0) >= item.woodCost
            const canAfford = woodOk && (item.diamondCost ? (profile.diamonds||0) >= item.diamondCost : profile.petals >= item.cost)
            return shopRow(item, profile.equippedAxe === item.id, owned, locked, canAfford, onBuyAxe, onEquipAxe, `🪓 ${item.chopDamage} chop dmg`)
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Carpentry panel (house upgrades + sawmill) ───────────────────────────────
function CarpentryPanel({ profile, onUpgrade, onBuySawmill, onClose }) {
  const [tab, setTab] = useState('house')
  const currentLevel = profile.houseLevel || 0
  const nextUpgrade  = HOUSE_UPGRADES[currentLevel]
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-800">🔨 Carpentry</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-3 py-1.5">
              <span>💰</span><span className="font-bold text-yellow-600">{profile.petals.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 rounded-xl px-2.5 py-1.5">
              <span>🪵</span><span className="font-bold text-amber-700">{(profile.wood||0).toLocaleString()}</span>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {['house','sawmill'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold ${tab===t?'text-amber-600 border-b-2 border-amber-400':'text-gray-400'}`}>
              {t === 'house' ? '🏠 House' : '🪚 Sawmill'}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {tab === 'house' && (
            <>
              {currentLevel > 0 && HOUSE_UPGRADES.slice(0, currentLevel).map(u => (
                <div key={u.level} className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                  <span>{u.emoji}</span><span className="text-sm text-green-700 font-semibold">{u.description}</span>
                </div>
              ))}
              {nextUpgrade ? (
                <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{nextUpgrade.emoji}</span>
                    <span className="font-extrabold text-amber-800">{nextUpgrade.name}</span>
                  </div>
                  <p className="text-sm text-amber-700 mb-3">{nextUpgrade.description}</p>
                  <motion.button onClick={onUpgrade}
                    disabled={profile.petals < nextUpgrade.cost}
                    className={`w-full font-bold py-2.5 rounded-xl text-sm ${profile.petals >= nextUpgrade.cost ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    whileTap={profile.petals >= nextUpgrade.cost ? { scale: 0.97 } : {}}>
                    Upgrade — 💰 {nextUpgrade.cost.toLocaleString()}
                  </motion.button>
                </div>
              ) : (
                <div className="text-center text-green-600 font-bold py-4">✨ Fully upgraded!</div>
              )}
            </>
          )}
          {tab === 'sawmill' && SAWMILL_UPGRADES.map(item => {
            const owned      = !!(profile.sawmillUpgrades || {})[item.id]
            const hasDiamond = !!item.diamondCost
            const canAfford  = hasDiamond ? (profile.diamonds||0) >= item.diamondCost : profile.petals >= item.cost
            return (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${owned?'border-amber-300 bg-amber-50':hasDiamond?'border-cyan-200 bg-cyan-50':'border-gray-200 bg-white'}`}>
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                  {hasDiamond && !owned && <div className="text-xs text-cyan-600 mt-0.5">💎 Diamond item</div>}
                </div>
                <motion.button onClick={() => !owned && onBuySawmill(item)}
                  disabled={owned || !canAfford}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl ${owned?'bg-amber-100 text-amber-700':canAfford?(hasDiamond?'bg-cyan-500 text-white shadow':'bg-white border border-gray-200 shadow'):'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  whileTap={!owned && canAfford ? { scale: 0.9 } : {}}>
                  {owned ? 'Built' : hasDiamond ? `💎 ${item.diamondCost}` : `💰 ${item.cost.toLocaleString()}`}
                </motion.button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Potions panel ────────────────────────────────────────────────────────────
function PotionsPanel({ profile, playerHp, maxHp, onBuyPotion, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-800">🧪 Potion Shop</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 mb-4">
          <Heart size={16} className="text-red-500" />
          <span className="text-sm font-bold text-red-600">HP: {playerHp} / {maxHp}</span>
          <div className="flex-1 ml-2 h-2 bg-red-100 rounded-full overflow-hidden">
            <div className="h-2 bg-red-500 rounded-full transition-all" style={{ width: `${(playerHp/maxHp)*100}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {POTIONS_SHOP.map(item => {
            const canAfford = profile.petals >= item.cost
            const full = playerHp >= maxHp
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-purple-100 bg-purple-50">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">+{item.hp} HP restored</div>
                </div>
                <motion.button onClick={() => onBuyPotion(item)}
                  disabled={!canAfford || full}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl ${full?'bg-gray-100 text-gray-400 cursor-not-allowed':canAfford?'bg-purple-500 text-white shadow hover:bg-purple-600':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  whileTap={canAfford&&!full?{scale:0.9}:{}}>
                  {full ? 'Full HP' : `💰 ${item.cost}`}
                </motion.button>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-center text-xs text-gray-400">💰 {profile.petals.toLocaleString()} available</div>
      </motion.div>
    </motion.div>
  )
}

// ─── Castle NPC dialog panel ──────────────────────────────────────────────────
const NPC_INFO = {
  weapons:   { name: 'Felix',  title: 'Weapons Master',  greeting: "Welcome warrior! I sell the finest swords and armour in the land. Protect yourself from the undead!",   emoji: '⚔️'  },
  carpentry: { name: 'Benny',  title: 'Master Carpenter', greeting: "Howdy! I can upgrade your house to a proper cabin. A good home makes for a good garden!",              emoji: '🔨' },
  potions:   { name: 'Elara', title: 'Alchemist',         greeting: "Ah, a visitor! My potions will keep you alive against those dreadful zombies. Buy wisely!",            emoji: '🧪' },
  general:   { name: 'Maggie', title: 'Merchant',          greeting: "Step right up! I carry seeds, tools and upgrades for your garden. Best prices in the realm!",         emoji: '🛒' },
}

function NpcDialogPanel({ npcId, onOpenShop, onClose }) {
  const info = NPC_INFO[npcId] || NPC_INFO.general
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{info.emoji}</div>
          <div>
            <div className="font-extrabold text-gray-800">{info.name}</div>
            <div className="text-xs text-gray-400">{info.title}</div>
          </div>
          <button onClick={onClose} className="ml-auto"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-800 italic">"{info.greeting}"</p>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={onOpenShop}
            className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl"
            whileTap={{ scale: 0.97 }}>
            Open Shop
          </motion.button>
          <motion.button onClick={onClose}
            className="px-4 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
            whileTap={{ scale: 0.97 }}>
            Leave
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Castle upgrade panel (task 9) ────────────────────────────────────────────
function CastleUpgradePanel({ profile, onBuyUpgrade, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏰</span>
            <h2 className="text-xl font-extrabold text-gray-800">Castle Upgrades</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-2">
          {CASTLE_UPGRADES.map(upgrade => {
            const owned       = !!(profile.castleUpgrades || {})[upgrade.id]
            const prereqMet   = !upgrade.requires || !!(profile.castleUpgrades || {})[upgrade.requires]
            const canAfford   = profile.petals >= upgrade.cost
            const locked      = !owned && !prereqMet
            return (
              <div key={upgrade.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${owned ? 'border-green-300 bg-green-50' : locked ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
                <span className="text-3xl">{upgrade.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{upgrade.name}</div>
                  <div className="text-xs text-gray-500">{upgrade.description}</div>
                  {locked && <div className="text-xs text-orange-500 mt-0.5">🔒 Requires: {CASTLE_UPGRADES.find(u=>u.id===upgrade.requires)?.name}</div>}
                </div>
                <motion.button onClick={() => !owned && !locked && onBuyUpgrade(upgrade)}
                  disabled={owned || locked || !canAfford}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl ${owned ? 'bg-green-100 text-green-700' : locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : canAfford ? 'bg-amber-500 text-white shadow hover:bg-amber-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  whileTap={!owned && !locked && canAfford ? { scale: 0.9 } : {}}>
                  {owned ? '✓ Built' : locked ? '🔒' : `💰 ${upgrade.cost.toLocaleString()}`}
                </motion.button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Diamond Shop panel ───────────────────────────────────────────────────────
function DiamondShopPanel({ profile, onBuy, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💎</span>
            <h2 className="text-xl font-extrabold text-gray-800">Diamond Shop</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 mb-4 text-center">
          <p className="text-sm font-bold text-cyan-700">💎 Your Diamonds: {(profile.diamonds||0).toLocaleString()}</p>
          <p className="text-xs text-cyan-500 mt-0.5">Use diamonds to buy top-tier upgrades!</p>
        </div>
        <div className="space-y-3">
          {DIAMOND_PACKS.map(pack => (
            <div key={pack.id} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-cyan-200 bg-cyan-50">
              <span className="text-3xl">{pack.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-gray-800">{pack.name}</div>
                <div className="text-sm text-cyan-600 font-bold">+{pack.amount} 💎 Diamonds</div>
              </div>
              <motion.button onClick={() => onBuy(pack)}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-cyan-500 text-white shadow hover:bg-cyan-600"
                whileTap={{ scale: 0.93 }}>
                {pack.price}
              </motion.button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Demo mode — purchases grant diamonds instantly.</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile]         = useState(null)
  const [showLogin, setShowLogin]     = useState(false)
  const [showShop, setShowShop]       = useState(false)
  const [showStats, setShowStats]     = useState(false)
  const [showWardrobe, setShowWardrobe] = useState(false)
  const [showHouse, setShowHouse]     = useState(false)
  const [showAd, setShowAd]           = useState(false)
  const [showCastle, setShowCastle]   = useState(false)
  const [nearHouse, setNearHouse]     = useState(false)
  const [selectedSeed, setSelectedSeed] = useState('daisy')
  const [toast, setToast]             = useState(null)
  const [dbStatus, setDbStatus]       = useState('…')
  // Combat & world state
  const [dayPhase, setDayPhase]       = useState('day')
  const [playerHp, setPlayerHp]       = useState(10)
  const [hardcoreGameOver, setHardcoreGameOver] = useState(null)  // { days, kills } | null
  const [showFeedback, setShowFeedback] = useState(false)
  const [castleShop, setCastleShop]   = useState(null)   // 'weapons'|'carpentry'|'potions'|'general'
  const [npcDialog, setNpcDialog]     = useState(null)   // npc id showing dialog
  const [nearNpcId, setNearNpcId]     = useState(null)
  const [equipSource, setEquipSource] = useState('sword')  // 'sword' | 'bow' | 'axe' | 'seeds'
  const [showDiamondShop, setShowDiamondShop] = useState(false)
  // Music system
  const [musicMuted, setMusicMuted] = useState(false)
  const musicAudioRef  = useRef(null)
  const musicTrackRef  = useRef(0)
  const musicStarted   = useRef(false)
  const equipSourceRef = useRef('sword')
  useEffect(() => { equipSourceRef.current = equipSource }, [equipSource])
  const [cycleProgress, setCycleProgress] = useState(0)    // 0-1 progress within current phase
  const [respawnSignal, setRespawnSignal] = useState(0)    // increments to trigger Garden3D respawn
  const dayTimerRef  = useRef(0)
  const dayPhaseRef  = useRef('day')
  const tickerRef    = useRef()
  const saveTimerRef = useRef()

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const ok = await checkApi()
      setDbStatus(ok ? '🟢 DB connected' : '🟡 Local only')

      const local = loadLocal()
      if (local?.username) {
        if (ok) {
          try {
            const r = await fetch(`${API}/load/${encodeURIComponent(local.username)}`, { signal: AbortSignal.timeout(2000) })
            if (r.ok) {
              const { profile: sp } = await r.json()
              if (sp?.username) { setProfile(hydrateProfile(sp)); return }
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

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.username) return
    saveLocal(profile)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (apiAvailable) apiSave(profile.username, profile)
    }, 2000)
  }, [profile])

  // ── Music player ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (MUSIC_TRACKS.length === 0) return
    const startMusic = () => {
      if (musicStarted.current) return
      musicStarted.current = true
      const audio = new Audio(MUSIC_TRACKS[0].src)
      audio.volume = 0.35
      musicAudioRef.current = audio
      audio.addEventListener('ended', () => {
        musicTrackRef.current = (musicTrackRef.current + 1) % MUSIC_TRACKS.length
        audio.src = MUSIC_TRACKS[musicTrackRef.current].src
        if (!musicMuted) audio.play().catch(() => {})
      })
      if (!musicMuted) audio.play().catch(() => {})
    }
    window.addEventListener('click', startMusic, { once: true })
    window.addEventListener('keydown', startMusic, { once: true })
    return () => {
      window.removeEventListener('click', startMusic)
      window.removeEventListener('keydown', startMusic)
    }
  }, [])

  useEffect(() => {
    const audio = musicAudioRef.current
    if (!audio) return
    if (musicMuted) audio.pause()
    else audio.play().catch(() => {})
  }, [musicMuted])

  // ── Auto-waterer ticker (task 6: uses charges) ────────────────────────────
  useEffect(() => {
    if (!profile) return
    clearInterval(tickerRef.current)
    tickerRef.current = setInterval(() => {
      setProfile(prev => {
        if (!prev || prev.waterers === 0 || (prev.autoHarvestCharges || 0) === 0) return prev
        const now      = Date.now()
        let gained     = 0
        let harvested  = 0
        const bonus    = (prev.houseLevel || 0) >= 4 ? 1.25 : 1
        const newPlots = prev.plots.map(plot => {
          if (!plot) return null
          const plant = PLANTS[plot.seedId]
          if (!plant) return null
          if (plot.state === 'ready') { gained += Math.floor(plant.reward * bonus); harvested++; return null }
          if (plot.state === 'growing') {
            const elapsed = (plot.elapsed || 0) + (now - (plot.savedAt || now))
            if (elapsed >= plot.totalGrowTime) return { ...plot, state: 'ready', savedAt: now }
          }
          return plot
        })
        if (gained === 0 && JSON.stringify(newPlots) === JSON.stringify(prev.plots)) return prev
        const newCharges = Math.max(0, (prev.autoHarvestCharges || 0) - harvested)
        return { ...prev, petals: prev.petals + gained, totalHarvested: prev.totalHarvested + gained, plots: newPlots, autoHarvestCharges: newCharges }
      })
    }, 500)
    return () => clearInterval(tickerRef.current)
  }, [profile?.waterers, profile?.autoHarvestCharges])

  // ── Day/night cycle (task 4) ───────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      dayTimerRef.current += 1000
      const cycleMs   = (DAY_SECONDS + NIGHT_SECONDS) * 1000
      const pos       = dayTimerRef.current % cycleMs
      const newPhase  = pos >= DAY_SECONDS * 1000 ? 'night' : 'day'
      // Update progress within the current phase
      if (newPhase === 'day') {
        setCycleProgress(pos / (DAY_SECONDS * 1000))
      } else {
        setCycleProgress((pos - DAY_SECONDS * 1000) / (NIGHT_SECONDS * 1000))
      }
      if (newPhase !== dayPhaseRef.current) {
        dayPhaseRef.current = newPhase
        setDayPhase(newPhase)
        if (newPhase === 'day') {
          setProfile(prev => prev ? ({ ...prev, dayCount: (prev.dayCount || 1) + 1 }) : prev)
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 2500)
  }, [])

  // ── Login (two-step with password, task 7) ─────────────────────────────────
  const handleLogin = useCallback(async (username, password, isRegister, gameMode = 'regular') => {
    try {
      const starter = { ...defaultProfile(username), gameMode }
      let loaded    = { ...starter, username }
      let success = false

      if (apiAvailable) {
        if (isRegister) {
          const result = await apiRegister(username, password, { ...starter, username })
          if (result?.ok) {
            loaded = hydrateProfile({ ...starter, username })
            success = true
          } else {
            return result?.error || 'Registration failed. Username may already be taken.'
          }
        } else {
          const result = await apiLoginUser(username, password)
          if (result?.ok && result.profile) {
            loaded = hydrateProfile({ ...result.profile, username })
            success = true
          } else {
            return 'Wrong username or password.'
          }
        }
      } else {
        // Offline / local dev (no API server): fall back to localStorage
        const local = loadLocal()
        if (isRegister) {
          // Allow creating a new account locally when running without a server
          loaded = hydrateProfile({ ...starter, username })
          success = true
        } else if (local?.username?.toLowerCase() === username.toLowerCase()) {
          loaded = local
          success = true
        } else {
          return 'Wrong username or password.'
        }
      }

      if (success) {
        loaded.username = username
        setProfile(loaded)
        saveLocal(loaded)
        setShowLogin(false)
        showToast(`Welcome${loaded.totalHarvested > 0 ? ' back' : ''}, ${username}! 🌸`)
      }
    } catch (err) {
      return 'Login error. Please try again.'
    }
  }, [showToast])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setShowStats(false)
    localStorage.removeItem(STORAGE_KEY)
    setProfile(defaultProfile())
    setShowLogin(true)
  }, [])

  // ── Player damaged by zombie / zombie rewards ────────────────────────────
  const handlePlayerDamaged = useCallback((opts = {}) => {
    // Handle plants destroyed by zombies
    if (opts.destroyPlots && opts.destroyPlots.length > 0) {
      setProfile(prev => {
        if (!prev) return prev
        const newPlots = [...prev.plots]
        let destroyed = 0
        for (const idx of opts.destroyPlots) {
          if (newPlots[idx]) {
            newPlots[idx] = null
            destroyed++
          }
        }
        if (destroyed > 0) showToast(`🧟 Zombies destroyed ${destroyed} plant${destroyed > 1 ? 's' : ''}!`)
        return { ...prev, plots: newPlots }
      })
      return
    }

    // Handle zombie kill reward
    if (opts.killed) {
      const killReward = 50
      setProfile(prev => prev ? ({
        ...prev,
        petals: prev.petals + killReward,
        zombieKills: (prev.zombieKills || 0) + 1,
      }) : prev)
      showToast(`Zombie slain! +${killReward} 💰`)
      return
    }

    // Handle all-zombies-cleared reward
    if (opts.clearReward) {
      const clearReward = 200
      setProfile(prev => prev ? ({
        ...prev,
        petals: prev.petals + clearReward,
      }) : prev)
      showToast(`Forest cleared! +${clearReward} 💰`)
      return
    }

    // Normal damage from zombie hit
    const def = profile?.equippedArmour
      ? (ARMOUR_SHOP.find(a => a.id === profile.equippedArmour)?.defense || 0) : 0
    // Each point of defense gives 10% chance to block a hit
    if (def > 0 && Math.random() < def * 0.1) return  // blocked
    setPlayerHp(hp => {
      const next = hp - 1
      if (next <= 0) {
        if (profile?.gameMode === 'hardcore') {
          // Hardcore: show stats screen and wipe progress
          const days  = profile?.dayCount  || 1
          const kills = profile?.zombieKills || 0
          setHardcoreGameOver({ days, kills })
          dayPhaseRef.current = 'day'
          dayTimerRef.current = 0
          setDayPhase('day')
          setProfile(prev => prev ? {
            ...defaultProfile(prev.username),
            gameMode: 'hardcore',
          } : prev)
        } else {
          // Regular: respawn at house, lose plants
          showToast('💀 You were killed! Respawning at the house...')
          dayPhaseRef.current = 'day'
          dayTimerRef.current = 0
          setDayPhase('day')
          setRespawnSignal(s => s + 1)
          setProfile(prev => prev ? ({
            ...prev,
            plots: Array(prev.plots.length).fill(null),
            dayCount: (prev.dayCount || 1) + 1,
          }) : prev)
        }
        return 10
      }
      return next
    })
  }, [profile, showToast])

  // ── Sleep through night (task 10) ─────────────────────────────────────────
  const handleSleep = useCallback(() => {
    showToast('😴 You slept through the night! A new day begins.')
    const cycleMs = (DAY_SECONDS + NIGHT_SECONDS) * 1000
    const pos     = dayTimerRef.current % cycleMs
    dayTimerRef.current += cycleMs - pos
    dayPhaseRef.current = 'day'
    setDayPhase('day')
    setProfile(prev => prev ? ({ ...prev, dayCount: (prev.dayCount || 1) + 1 }) : prev)
  }, [showToast])

  // ── NPC / castle shop handlers (tasks 1, 7, 8) ───────────────────────────
  const handleTalkToNpc = useCallback((npcId) => {
    if (npcDialog || castleShop) return  // prevent opening when a dialog/shop is already open
    setNpcDialog(npcId)
  }, [npcDialog, castleShop])

  const handleNpcOpenShop = useCallback(() => {
    setCastleShop(npcDialog)
    setNpcDialog(null)
  }, [npcDialog])

  // Tasks 3 & 5: hotbar keys 1-4 and E to close active shop/dialog
  useEffect(() => {
    const handleKey = (e) => {
      // Task 5: E closes active shop or dialog
      if (e.code === 'KeyE') {
        if (castleShop) { setCastleShop(null); return }
        if (npcDialog)  { setNpcDialog(null);  return }
      }
      // Task 3: number keys select hotbar slot
      if (e.key === '1') setEquipSource('sword')
      else if (e.key === '2') setEquipSource('bow')
      else if (e.key === '3') setEquipSource('axe')
      else if (e.key === '4') setEquipSource('seeds')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [castleShop, npcDialog])

  const handleBuyWeapon = useCallback((item) => {
    setProfile(prev => {
      if (!prev) return prev
      if (item.diamondCost) {
        if ((prev.diamonds||0) < item.diamondCost) { showToast('Not enough diamonds! 💎'); return prev }
        showToast(`${item.emoji} ${item.name} bought and equipped!`)
        return { ...prev, diamonds: (prev.diamonds||0) - item.diamondCost, ownedWeapons: { ...prev.ownedWeapons, [item.id]: true }, equippedWeapon: item.id }
      }
      if (prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      showToast(`${item.emoji} ${item.name} bought and equipped!`)
      return { ...prev, petals: prev.petals - item.cost, ownedWeapons: { ...prev.ownedWeapons, [item.id]: true }, equippedWeapon: item.id }
    })
  }, [showToast])

  const handleEquipWeapon = useCallback((item) => {
    setProfile(prev => prev ? ({ ...prev, equippedWeapon: item.id }) : prev)
  }, [])

  const handleBuyArmour = useCallback((item) => {
    setProfile(prev => {
      if (!prev) return prev
      if (item.woodCost && (prev.wood || 0) < item.woodCost) { showToast(`Not enough wood! Need 🪵 ${item.woodCost}`); return prev }
      if (item.diamondCost) {
        if ((prev.diamonds||0) < item.diamondCost) { showToast('Not enough diamonds! 💎'); return prev }
        showToast(`${item.emoji} ${item.name} bought and equipped!`)
        return { ...prev, diamonds: (prev.diamonds||0) - item.diamondCost, wood: (prev.wood||0) - (item.woodCost||0), ownedArmour: { ...prev.ownedArmour, [item.id]: true }, equippedArmour: item.id }
      }
      if (prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      showToast(`${item.emoji} ${item.name} bought and equipped!`)
      return { ...prev, petals: prev.petals - item.cost, wood: (prev.wood||0) - (item.woodCost||0), ownedArmour: { ...prev.ownedArmour, [item.id]: true }, equippedArmour: item.id }
    })
  }, [showToast])

  const handleEquipArmour = useCallback((item) => {
    setProfile(prev => prev ? ({ ...prev, equippedArmour: item.id }) : prev)
  }, [])

  const handleBuyPotion = useCallback((item) => {
    setProfile(prev => {
      if (!prev || prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      setPlayerHp(hp => Math.min(10, hp + item.hp))
      showToast(`+${item.hp} HP restored! 🧪`)
      return { ...prev, petals: prev.petals - item.cost }
    })
  }, [showToast])

  const handleBuyAxe = useCallback((item) => {
    setProfile(prev => {
      if (!prev) return prev
      if (item.woodCost && (prev.wood || 0) < item.woodCost) { showToast(`Not enough wood! Need 🪵 ${item.woodCost}`); return prev }
      if (item.diamondCost) {
        if ((prev.diamonds||0) < item.diamondCost) { showToast('Not enough diamonds! 💎'); return prev }
        showToast(`${item.emoji} ${item.name} bought and equipped!`)
        return { ...prev, diamonds: (prev.diamonds||0) - item.diamondCost, wood: (prev.wood||0) - (item.woodCost||0), ownedAxes: { ...prev.ownedAxes, [item.id]: true }, equippedAxe: item.id }
      }
      if (prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      showToast(`${item.emoji} ${item.name} bought and equipped!`)
      return { ...prev, petals: prev.petals - item.cost, wood: (prev.wood||0) - (item.woodCost||0), ownedAxes: { ...prev.ownedAxes, [item.id]: true }, equippedAxe: item.id }
    })
  }, [showToast])

  const handleEquipAxe = useCallback((item) => {
    setProfile(prev => prev ? ({ ...prev, equippedAxe: item.id }) : prev)
  }, [])

  const handleBuySawmill = useCallback((item) => {
    setProfile(prev => {
      if (!prev) return prev
      if ((prev.sawmillUpgrades || {})[item.id]) return prev
      if (item.diamondCost) {
        if ((prev.diamonds||0) < item.diamondCost) { showToast('Not enough diamonds! 💎'); return prev }
        showToast(`${item.emoji} ${item.name} built!`)
        return { ...prev, diamonds: (prev.diamonds||0) - item.diamondCost, sawmillUpgrades: { ...prev.sawmillUpgrades, [item.id]: true } }
      }
      if (prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      showToast(`${item.emoji} ${item.name} built!`)
      return { ...prev, petals: prev.petals - item.cost, sawmillUpgrades: { ...prev.sawmillUpgrades, [item.id]: true } }
    })
  }, [showToast])

  const handleBuyFertUpgrade = useCallback((tierIdx) => {
    setProfile(prev => {
      if (!prev) return prev
      const upgrade = FERTILIZER_UPGRADES[tierIdx]
      if (!upgrade) return prev
      const currentTier = prev.fertilizerTier || 0
      const isUnlocking = tierIdx === currentTier  // unlocking next tier
      const isRecharging = tierIdx < currentTier    // recharging already-unlocked tier
      // task 4 (file): block recharging superseded non-diamond tiers
      const isSuperseded = !upgrade.diamondCost && isRecharging && currentTier > tierIdx + 1
      if (isSuperseded) { showToast('Upgrade to a higher fertilizer tier first!'); return prev }

      if (upgrade.diamondCost) {
        if ((prev.diamonds||0) < upgrade.diamondCost) { showToast('Not enough diamonds! 💎'); return prev }
        showToast(`${upgrade.emoji} ${upgrade.name}! +100 plant charges`)
        return { ...prev, diamonds: (prev.diamonds||0) - upgrade.diamondCost, fertilizerTier: Math.max(currentTier, tierIdx+1), fertilizerCharges: (prev.fertilizerCharges||0) + 100 }
      }

      if (isUnlocking) {
        if (prev.petals < upgrade.cost) { showToast('Not enough gold!'); return prev }
        showToast(`${upgrade.emoji} ${upgrade.name} unlocked! +100 plant charges (${upgrade.speedMult}×)`)
        return { ...prev, petals: prev.petals - upgrade.cost, fertilizerTier: tierIdx + 1, fertilizerCharges: (prev.fertilizerCharges||0) + 100 }
      } else if (isRecharging) {
        const rechargeCost = Math.floor(upgrade.cost * 0.4)
        if (prev.petals < rechargeCost) { showToast('Not enough gold!'); return prev }
        showToast(`${upgrade.emoji} Recharged! +100 more plants at ${upgrade.speedMult}×`)
        return { ...prev, petals: prev.petals - rechargeCost, fertilizerTier: tierIdx + 1, fertilizerCharges: (prev.fertilizerCharges||0) + 100 }
      }
      return prev
    })
  }, [showToast])

  const handleTreeChopped = useCallback((baseWood) => {
    setProfile(prev => {
      if (!prev) return prev
      const ownedUpgrades = prev.sawmillUpgrades || {}
      const mult = SAWMILL_UPGRADES.reduce((m, u) => ownedUpgrades[u.id] ? u.woodMult : m, 1)
      const wood = Math.floor(baseWood * mult)
      showToast(`🪵 Tree chopped! +${wood} wood`)
      return { ...prev, wood: (prev.wood || 0) + wood }
    })
  }, [showToast])

  const handleFeedbackSubmit = useCallback(async (message) => {
    await apiFeedback(profile?.username, message)
  }, [profile?.username])

  const handleBuyCastleUpgrade = useCallback((upgrade) => {
    setProfile(prev => {
      if (!prev || prev.petals < upgrade.cost) { showToast('Not enough gold!'); return prev }
      if ((prev.castleUpgrades || {})[upgrade.id]) return prev
      showToast(`Castle upgraded: ${upgrade.name}! 🏰`)
      return { ...prev, petals: prev.petals - upgrade.cost, castleUpgrades: { ...prev.castleUpgrades, [upgrade.id]: true } }
    })
  }, [showToast])

  // ── Plot click ─────────────────────────────────────────────────────────────
  const handlePlotClick = useCallback((index) => {
    setProfile(prev => {
      if (!prev) return prev
      const plot  = prev.plots[index]
      const plant = plot ? PLANTS[plot.seedId] : null

      const isGrown = plot && plant && (
        plot.state === 'ready' ||
        (plot.state === 'growing' &&
          (plot.elapsed || 0) + (Date.now() - (plot.savedAt || Date.now())) >= plot.totalGrowTime)
      )

      if (isGrown) {
        const bonus    = (prev.houseLevel || 0) >= 4 ? 1.25 : 1
        const reward   = Math.floor(plant.reward * bonus)
        const newPlots = [...prev.plots]
        newPlots[index] = null
        showToast(`+${reward.toLocaleString()} 💰 ${plant.name} harvested!`)
        playCrunchSound()
        return { ...prev, petals: prev.petals + reward, totalHarvested: prev.totalHarvested + reward, plots: newPlots }
      }

      if (!plot && selectedSeed) {
        if (equipSourceRef.current !== 'seeds') return prev  // only plant in seeds mode
        const p = PLANTS[selectedSeed]
        if (!p) return prev
        const owned      = prev.ownedSeeds[selectedSeed] || 0
        const isUnlocked = (prev.unlockedPlants || []).includes(selectedSeed)
        if (!isUnlocked) { showToast(`Unlock ${p.name} in the shop first! 🔒`); return prev }
        if (p.seedCost > 0 && owned === 0) { showToast(`No ${p.name} seeds! Buy from the shop.`); return prev }

        const fertCharges   = prev.fertilizerCharges || 0
        const fertTier      = prev.fertilizerTier || 0
        const permSpeedMult = (fertTier > 0 && fertCharges > 0)
          ? (FERTILIZER_UPGRADES[fertTier - 1]?.speedMult || 1) : 1
        const speedMult = (prev.hasFertilizer ? 0.5 : 1) * ((prev.houseLevel || 0) >= 1 ? 0.9 : 1) / permSpeedMult
        const totalGrowTime = p.growTime * speedMult
        const newPlots = [...prev.plots]
        newPlots[index] = { seedId: selectedSeed, state: 'growing', elapsed: 0, totalGrowTime, savedAt: Date.now() }
        const newOwned = { ...prev.ownedSeeds }
        if (p.seedCost > 0) newOwned[selectedSeed] = Math.max(0, owned - 1)
        const newCharges = fertTier > 0 && fertCharges > 0 ? Math.max(0, fertCharges - 1) : fertCharges
        playCrunchSound()
        return { ...prev, plots: newPlots, ownedSeeds: newOwned, hasFertilizer: false, fertilizerCharges: newCharges }
      }
      return prev
    })
  }, [selectedSeed, showToast])

  // ── Buy seeds ──────────────────────────────────────────────────────────────
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

  // ── Unlock plant ───────────────────────────────────────────────────────────
  const handleUnlock = useCallback((plantId) => {
    const plant = PLANTS[plantId]
    if (!plant) return
    if (plant.diamondUnlockCost) {
      // diamond-gated seed
      setProfile(prev => {
        if (!prev || (prev.diamonds || 0) < plant.diamondUnlockCost) { showToast('Not enough diamonds! 💎'); return prev }
        if ((prev.unlockedPlants || []).includes(plantId)) return prev
        showToast(`🔓 ${plant.name} unlocked! You can now buy seeds.`)
        return { ...prev, diamonds: (prev.diamonds||0) - plant.diamondUnlockCost, unlockedPlants: [...(prev.unlockedPlants || []), plantId] }
      })
      return
    }
    setProfile(prev => {
      if (!prev || prev.petals < plant.unlockCost) return prev
      if ((prev.unlockedPlants || []).includes(plantId)) return prev
      showToast(`🔓 ${plant.name} unlocked! You can now buy seeds.`)
      return { ...prev, petals: prev.petals - plant.unlockCost, unlockedPlants: [...(prev.unlockedPlants || []), plantId] }
    })
  }, [showToast])

  // ── Buy upgrade ────────────────────────────────────────────────────────────
  const handleBuyItem = useCallback((itemId, cost) => {
    setProfile(prev => {
      if (!prev || prev.petals < cost) return prev
      const update = { petals: prev.petals - cost }
      if (itemId === 'waterer') {
        if (prev.waterers >= 10) return prev
        update.waterers = prev.waterers + 1
        const baseCharges  = (prev.houseLevel || 0) >= 3 ? 30 : 20
        const chargesGiven = baseCharges * (prev.waterers + 1)
        update.autoHarvestCharges = (prev.autoHarvestCharges || 0) + chargesGiven
        showToast(`Auto Waterer activated! 💧 +${chargesGiven} charges`)
      } else if (itemId === 'fertilizer') {
        update.hasFertilizer = true
        showToast('Fertilizer ready! Next plant grows 2× faster ✨')
      } else if (itemId === 'plot_expansion') {
        const extra = prev.extraRows || 0
        if (extra >= 15) return prev
        update.extraRows = extra + 1
        update.plots = [...prev.plots, ...Array(5).fill(null)]
        showToast('Garden expanded! 🪴 New row unlocked!')
      } else if (itemId === 'refill_charges') {
        update.autoHarvestCharges = (prev.autoHarvestCharges || 0) + 50
        showToast('Refilled 50 auto-harvest charges 🔋')
      }
      return { ...prev, ...update }
    })
  }, [showToast])

  // ── House upgrade (task 1) ─────────────────────────────────────────────────
  const handleHouseUpgrade = useCallback(() => {
    setProfile(prev => {
      if (!prev) return prev
      const current = prev.houseLevel || 0
      const next    = HOUSE_UPGRADES[current]
      if (!next || prev.petals < next.cost) return prev
      showToast(`🏠 House upgraded to ${next.name}!`)
      return { ...prev, petals: prev.petals - next.cost, houseLevel: current + 1 }
    })
  }, [showToast])

  // ── Watch ad (task 2) ──────────────────────────────────────────────────────
  const handleWatchAd = useCallback(() => {
    setProfile(prev => {
      if (!prev) return prev
      const now = Date.now()
      const newPlots = prev.plots.map(plot => {
        if (!plot || plot.state !== 'growing') return plot
        const elapsed     = (plot.elapsed || 0) + (now - (plot.savedAt || now))
        const remaining   = Math.max(0, plot.totalGrowTime - elapsed)
        const newTotal    = elapsed + remaining * 0.5   // halve the remaining time
        return { ...plot, elapsed, totalGrowTime: newTotal, savedAt: now }
      })
      showToast('🚀 2× growth boost applied to all growing plants!')
      return { ...prev, plots: newPlots, lastAdTime: now }
    })
  }, [showToast])

  // ── Wardrobe purchase (task 3/5) ───────────────────────────────────────────
  const handleWardrobePurchase = useCallback((category, item) => {
    setProfile(prev => {
      if (!prev || prev.petals < item.cost) { showToast('Not enough gold!'); return prev }
      const newOwned = { ...prev.wardrobeOwned, [item.id]: true }
      // Auto-equip after purchase
      const newOutfit = { ...prev.outfit }
      if (category === 'shirts') newOutfit.shirtColor = item.color
      if (category === 'pants')  newOutfit.pantsColor = item.color
      if (category === 'hats')   { newOutfit.hatColor = item.hatColor; newOutfit.hatBrim = item.hatBrim }
      if (category === 'tools')  newOutfit.toolId     = item.id
      showToast(`Bought & equipped ${item.name}! 🎉`)
      return { ...prev, petals: prev.petals - item.cost, wardrobeOwned: newOwned, outfit: newOutfit }
    })
  }, [showToast])

  // ── Diamond shop purchase ──────────────────────────────────────────────────
  const handleBuyDiamondPack = useCallback((pack) => {
    setProfile(prev => {
      if (!prev) return prev
      showToast(`+${pack.amount} 💎 Diamonds added!`)
      return { ...prev, diamonds: (prev.diamonds || 0) + pack.amount }
    })
  }, [showToast])

  // ── Wardrobe equip (task 3/5) ──────────────────────────────────────────────
  const handleWardrobeEquip = useCallback((category, item) => {
    setProfile(prev => {
      if (!prev) return prev
      const newOutfit = { ...prev.outfit }
      if (category === 'shirts') newOutfit.shirtColor = item.color
      if (category === 'pants')  newOutfit.pantsColor = item.color
      if (category === 'hats')   { newOutfit.hatColor = item.hatColor; newOutfit.hatBrim = item.hatBrim }
      if (category === 'tools')  newOutfit.toolId     = item.id
      return { ...prev, outfit: newOutfit }
    })
  }, [])

  if (!profile) return null

  // Don't run the game behind the login screen
  if (showLogin) {
    return (
      <div className="fixed inset-0 overflow-hidden font-rounded">
        <LoginOverlay onLogin={handleLogin} />
      </div>
    )
  }

  const totalRows = 5 + (profile.extraRows || 0)
  const plots     = [...profile.plots]
  while (plots.length < totalRows * 5) plots.push(null)

  const unlockedPlants  = profile.unlockedPlants || ['daisy']
  const seedBarPlants   = Object.values(PLANTS).filter(p => unlockedPlants.includes(p.id))
  const adCooldown      = 120000  // 2 minutes
  const adReady         = Date.now() - (profile.lastAdTime || 0) > adCooldown
  const weaponItem      = profile.equippedWeapon ? WEAPONS_SHOP.find(w => w.id === profile.equippedWeapon) : null
  const attackDamage    = 1 + (weaponItem?.damage || 0)
  const weaponRange     = weaponItem?.range || 0
  const defense         = profile.equippedArmour ? (ARMOUR_SHOP.find(a => a.id === profile.equippedArmour)?.defense || 0) : 0
  const axeItem         = profile.equippedAxe ? AXES_SHOP.find(a => a.id === profile.equippedAxe) : null
  const chopDamage      = axeItem?.chopDamage || 0

  return (
    <div className="fixed inset-0 overflow-hidden font-rounded">
      <Garden3D
        plots={plots}
        selectedSeed={selectedSeed}
        onPlotClick={handlePlotClick}
        profile={profile}
        outfit={profile.outfit || DEFAULT_OUTFIT}
        onNearHouse={setNearHouse}
        onHouseEnter={() => setShowHouse(true)}
        dayPhase={dayPhase}
        onPlayerDamaged={handlePlayerDamaged}
        onTalkToNpc={handleTalkToNpc}
        onNearNpc={setNearNpcId}
        onSleep={handleSleep}
        attackDamage={attackDamage}
        weaponRange={weaponRange}
        equipSource={equipSource}
        chopDamage={chopDamage}
        onTreeChopped={handleTreeChopped}
        treeBaseReward={TREE_BASE_WOOD}
        respawnSignal={respawnSignal}
        onMessage={showToast}
        shopOpen={!!(castleShop || npcDialog)}
      />

      <AnimatePresence>
        {showLogin && <LoginOverlay onLogin={handleLogin} />}
      </AnimatePresence>
      <AnimatePresence>
        {hardcoreGameOver && (
          <HardcoreGameOverScreen
            days={hardcoreGameOver.days}
            kills={hardcoreGameOver.kills}
            onDismiss={() => setHardcoreGameOver(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShop && (
          <ShopPanel profile={profile}
            onBuySeed={handleBuySeed} onUnlock={handleUnlock}
            onBuyItem={handleBuyItem} onBuyFertUpgrade={handleBuyFertUpgrade} onClose={() => setShowShop(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showStats && (
          <StatsPanel profile={profile} onClose={() => setShowStats(false)} onLogout={handleLogout} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showWardrobe && (
          <WardrobePanel profile={profile}
            onPurchase={handleWardrobePurchase}
            onEquip={handleWardrobeEquip}
            onClose={() => setShowWardrobe(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showHouse && (
          <HousePanel profile={profile}
            onUpgrade={handleHouseUpgrade}
            onClose={() => setShowHouse(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAd && (
          <AdPanel onWatched={handleWatchAd} onClose={() => setShowAd(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFeedback && (
          <FeedbackPanel onSubmit={handleFeedbackSubmit} onClose={() => setShowFeedback(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {npcDialog && (
          <NpcDialogPanel npcId={npcDialog} onOpenShop={handleNpcOpenShop} onClose={() => setNpcDialog(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {castleShop === 'weapons' && (
          <WeaponsPanel profile={profile}
            onBuyWeapon={handleBuyWeapon} onBuyArmour={handleBuyArmour}
            onEquipWeapon={handleEquipWeapon} onEquipArmour={handleEquipArmour}
            onBuyAxe={handleBuyAxe} onEquipAxe={handleEquipAxe}
            onClose={() => setCastleShop(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {castleShop === 'carpentry' && (
          <CarpentryPanel profile={profile} onUpgrade={handleHouseUpgrade}
            onBuySawmill={handleBuySawmill} onClose={() => setCastleShop(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {castleShop === 'potions' && (
          <PotionsPanel profile={profile} playerHp={playerHp} maxHp={10}
            onBuyPotion={handleBuyPotion} onClose={() => setCastleShop(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {castleShop === 'general' && (
          <ShopPanel profile={profile}
            onBuySeed={handleBuySeed} onUnlock={handleUnlock}
            onBuyItem={handleBuyItem} onBuyFertUpgrade={handleBuyFertUpgrade} onClose={() => setCastleShop(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCastle && (
          <CastleUpgradePanel profile={profile}
            onBuyUpgrade={handleBuyCastleUpgrade}
            onClose={() => setShowCastle(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiamondShop && (
          <DiamondShopPanel profile={profile}
            onBuy={handleBuyDiamondPack}
            onClose={() => setShowDiamondShop(false)} />
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

      {/* Near-house prompt */}
      <AnimatePresence>
        {nearHouse && !showHouse && (
          <motion.div
            className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-30 backdrop-blur text-white font-bold px-5 py-2.5 rounded-2xl shadow-xl text-sm pointer-events-none ${dayPhase === 'night' ? 'bg-indigo-600/90' : 'bg-amber-500/90'}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            {dayPhase === 'night' ? 'Press E to sleep through the night 😴' : 'Press E to enter the house 🏠'}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Near NPC prompt */}
      <AnimatePresence>
        {nearNpcId && !npcDialog && !castleShop && (
          <motion.div
            className="fixed bottom-36 left-1/2 -translate-x-1/2 z-30 bg-amber-700/90 backdrop-blur text-white font-bold px-5 py-2.5 rounded-2xl shadow-xl text-sm pointer-events-none"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            Press E to talk to {NPC_INFO[nearNpcId]?.name || 'NPC'} {NPC_INFO[nearNpcId]?.emoji}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Night warning */}
      <AnimatePresence>
        {dayPhase === 'night' && (
          <motion.div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-indigo-900/80 backdrop-blur text-indigo-100 font-bold px-4 py-1.5 rounded-xl shadow text-xs pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            🌙 Night — Zombies are active!
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

          <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-end">
            {/* Day/night indicator + clock */}
            <div className={`flex items-center gap-2 backdrop-blur border rounded-2xl px-3 py-2 shadow text-sm font-bold ${dayPhase === 'night' ? 'bg-indigo-900/80 border-indigo-600 text-indigo-100' : 'bg-yellow-50/80 border-yellow-200 text-yellow-700'}`}>
              {dayPhase === 'night' ? '🌙' : '☀️'} {dayPhase === 'night' ? 'Night' : 'Day'} {profile.dayCount || 1}
              <div className="w-16 h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${dayPhase === 'night' ? 'bg-indigo-300' : 'bg-yellow-300'}`}
                  style={{ width: `${Math.round(cycleProgress * 100)}%` }}
                />
              </div>
              <span className="text-xs opacity-70">{Math.round(cycleProgress * 100)}%</span>
            </div>
            {/* HP bar */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-red-200 rounded-2xl px-3 py-2 shadow">
              <Heart size={14} className="text-red-500" />
              <div className="flex gap-0.5">
                {Array.from({length: 10}).map((_,i) => (
                  <div key={i} className={`w-2 h-3 rounded-sm ${i < playerHp ? 'bg-red-500' : 'bg-red-100'}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-yellow-200 rounded-2xl px-3 py-2 shadow">
              <span>💰</span>
              <span className="font-extrabold text-yellow-600 text-lg">{profile.petals.toLocaleString()}</span>
            </div>
            {(profile.wood || 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-amber-200 rounded-2xl px-3 py-2 shadow">
                <span>🪵</span>
                <span className="font-extrabold text-amber-700 text-sm">{(profile.wood || 0).toLocaleString()}</span>
              </div>
            )}
            {(profile.diamonds || 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-cyan-200 rounded-2xl px-3 py-2 shadow">
                <span>💎</span>
                <span className="font-extrabold text-cyan-600 text-sm">{(profile.diamonds || 0).toLocaleString()}</span>
              </div>
            )}
            {profile.waterers > 0 && (
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur border border-blue-200 rounded-2xl px-2.5 py-2 shadow">
                <span className="text-sm">💧</span>
                <span className="text-xs font-bold text-blue-500">{profile.autoHarvestCharges}</span>
              </div>
            )}
            {/* Diamond shop button */}
            <motion.button onClick={() => setShowDiamondShop(true)}
              className="bg-white/80 backdrop-blur border border-cyan-200 rounded-2xl p-2 shadow text-cyan-500 hover:text-cyan-700"
              whileTap={{ scale: 0.9 }} title="Buy Diamonds">
              <span className="text-lg">💎</span>
            </motion.button>
            {/* Music toggle button */}
            <motion.button onClick={() => setMusicMuted(m => !m)}
              className="bg-white/80 backdrop-blur border border-purple-200 rounded-2xl p-2 shadow text-purple-500 hover:text-purple-700"
              whileTap={{ scale: 0.9 }} title={musicMuted ? 'Unmute music' : 'Mute music'}>
              <span className="text-lg">{musicMuted ? '🔇' : '🎵'}</span>
            </motion.button>
            {/* Ad button */}
            <motion.button onClick={() => adReady && setShowAd(true)}
              disabled={!adReady}
              className={`bg-white/80 backdrop-blur border rounded-2xl p-2 shadow text-sm font-bold ${adReady ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
              whileTap={adReady ? { scale: 0.9 } : {}} title="Watch ad for 2× growth boost">
              <Tv size={16} />
            </motion.button>
            {/* Feedback button */}
            <motion.button onClick={() => setShowFeedback(true)}
              className="bg-white/80 backdrop-blur border border-indigo-200 rounded-2xl p-2 shadow text-indigo-500 hover:text-indigo-700"
              whileTap={{ scale: 0.9 }} title="Send feedback">
              <MessageSquare size={16} />
            </motion.button>
            {/* Castle upgrades button */}
            <motion.button onClick={() => setShowCastle(true)}
              className="bg-white/80 backdrop-blur border border-amber-200 rounded-2xl p-2 shadow text-amber-600 hover:text-amber-800"
              whileTap={{ scale: 0.9 }} title="Castle upgrades">
              <span className="text-lg">🏰</span>
            </motion.button>
            {/* Wardrobe button */}
            <motion.button onClick={() => setShowWardrobe(true)}
              className="bg-white/80 backdrop-blur border border-purple-200 rounded-2xl p-2 shadow text-purple-500 hover:text-purple-700"
              whileTap={{ scale: 0.9 }}>
              <Shirt size={16} />
            </motion.button>
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
        {/* Hotbar: mode tabs + seed sub-bar */}
        <div className="flex flex-col gap-1.5">
          {/* Mode tabs */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-1.5 shadow flex gap-1.5 items-center justify-center">
            {(() => {
              const hasSword = Object.keys(profile.ownedWeapons || {}).some(id => WEAPONS_SHOP.find(w => w.id === id && w.range === 0))
              const hasBow   = Object.keys(profile.ownedWeapons || {}).some(id => WEAPONS_SHOP.find(w => w.id === id && w.range > 0))
              const hasAxe   = Object.keys(profile.ownedAxes || {}).length > 0
              return [
                { key: 'sword', label: 'Sword', emoji: '⚔️',  color: 'red',    unlocked: hasSword },
                { key: 'bow',   label: 'Bow',   emoji: '🏹',  color: 'amber',  unlocked: hasBow   },
                { key: 'axe',   label: 'Axe',   emoji: '🪓',  color: 'orange', unlocked: hasAxe   },
                { key: 'seeds', label: 'Seeds', emoji: '🌱',  color: 'green',  unlocked: true     },
              ].map(({ key, label, emoji, color, unlocked }) => {
                const active = equipSource === key
                const colorMap = {
                  red:    active ? 'border-red-400 bg-red-50 text-red-700'       : 'border-gray-200 bg-white text-gray-500 hover:border-red-200',
                  amber:  active ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-amber-200',
                  orange: active ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:border-orange-200',
                  green:  active ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:border-green-200',
                }
                if (!unlocked) {
                  return (
                    <div key={key} title={`Buy a ${label} first`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-300 text-sm font-bold cursor-not-allowed opacity-50">
                      <span>{emoji}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  )
                }
                return (
                  <motion.button key={key}
                    onClick={() => setEquipSource(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-bold transition-all ${colorMap[color]}`}
                    whileTap={{ scale: 0.92 }}>
                    <span>{emoji}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </motion.button>
                )
              })
            })()}
          </div>
          {/* Seed sub-bar — only visible in seeds mode */}
          {equipSource === 'seeds' && (
            <div className="bg-white/80 backdrop-blur rounded-2xl p-1.5 shadow flex flex-wrap gap-1.5 items-center justify-center">
              {seedBarPlants.map(plant => {
                const owned     = profile.ownedSeeds[plant.id] || 0
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
          )}
        </div>
        {(profile.dayCount || 1) <= 1 && (
          <p className="text-center text-xs text-white/70 font-semibold drop-shadow">
            WASD/arrows to move · Space to jump · E: interact/attack/sleep · Click plot to plant
          </p>
        )}
      </div>
    </div>
  )
}
