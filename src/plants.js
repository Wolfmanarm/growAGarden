// ─── 100-plant catalogue ─────────────────────────────────────────────────────
// Each tier has a growth-time base and reward base; plants scale within tier.

const TIER_CFG = {
  1: { baseGrow: 8000,      baseReward: 5,      growMult: 1.14, rewardMult: 1.22,
       theme: { color: 'from-green-50 to-yellow-100',   border: 'border-green-300',   label: 'Common'    } },
  2: { baseGrow: 60000,     baseReward: 110,    growMult: 1.14, rewardMult: 1.22,
       theme: { color: 'from-blue-50 to-cyan-100',      border: 'border-blue-300',    label: 'Uncommon'  } },
  3: { baseGrow: 300000,    baseReward: 750,    growMult: 1.14, rewardMult: 1.22,
       theme: { color: 'from-purple-50 to-pink-100',    border: 'border-purple-300',  label: 'Rare'      } },
  4: { baseGrow: 1800000,   baseReward: 6000,   growMult: 1.12, rewardMult: 1.20,
       theme: { color: 'from-orange-50 to-red-100',     border: 'border-orange-400',  label: 'Epic'      } },
  5: { baseGrow: 10800000,  baseReward: 55000,  growMult: 1.10, rewardMult: 1.18,
       theme: { color: 'from-yellow-50 to-amber-100',   border: 'border-yellow-500',  label: 'Legendary' } },
}

// Templates: [id, name, emoji, tier, indexWithinTier]
// Index 0 of tier 1 is always daisy (free, always unlocked)
const TEMPLATES = [
  // ── Tier 1 : Common ──────────────────────────────────────────────────────
  ['daisy',            'Daisy',              '🌼', 1],
  ['clover',           'Clover',             '🍀', 1],
  ['dandelion',        'Dandelion',          '🌾', 1],
  ['violet',           'Violet',             '🪻', 1],
  ['chamomile',        'Chamomile',          '🌸', 1],
  ['forget_me_not',    'Forget-Me-Not',      '🌸', 1],
  ['buttercup',        'Buttercup',          '🌼', 1],
  ['poppy',            'Poppy',              '🌺', 1],
  ['marigold',         'Marigold',           '🌻', 1],
  ['lavender',         'Lavender',           '🪻', 1],
  ['pansy',            'Pansy',              '🌷', 1],
  ['primrose',         'Primrose',           '🌸', 1],
  ['cornflower',       'Cornflower',         '💐', 1],
  ['snapdragon',       'Snapdragon',         '🌺', 1],
  ['aster',            'Aster',              '🌸', 1],
  ['zinnia',           'Zinnia',             '🌼', 1],
  ['begonia',          'Begonia',            '🌸', 1],
  ['cosmos',           'Cosmos',             '🌸', 1],
  ['petunia',          'Petunia',            '🌷', 1],
  ['lily_of_valley',   'Lily of the Valley', '🌸', 1],

  // ── Tier 2 : Uncommon ────────────────────────────────────────────────────
  ['sunflower',        'Sunflower',          '🌻', 2],
  ['tulip',            'Tulip',              '🌷', 2],
  ['dahlia',           'Dahlia',             '🌸', 2],
  ['carnation',        'Carnation',          '🌺', 2],
  ['hydrangea',        'Hydrangea',          '🌸', 2],
  ['iris',             'Iris',               '🪻', 2],
  ['chrysanthemum',    'Chrysanthemum',      '🌸', 2],
  ['geranium',         'Geranium',           '🌺', 2],
  ['foxglove',         'Foxglove',           '🌸', 2],
  ['anemone',          'Anemone',            '🌸', 2],
  ['camellia',         'Camellia',           '🌸', 2],
  ['bleeding_heart',   'Bleeding Heart',     '🌸', 2],
  ['columbine',        'Columbine',          '🌸', 2],
  ['delphinium',       'Delphinium',         '🌸', 2],
  ['freesia',          'Freesia',            '🌸', 2],
  ['gardenia',         'Gardenia',           '🌸', 2],
  ['hibiscus',         'Hibiscus',           '🌺', 2],
  ['jasmine',          'Jasmine',            '🌸', 2],
  ['magnolia',         'Magnolia',           '🌸', 2],
  ['wisteria',         'Wisteria',           '🪻', 2],

  // ── Tier 3 : Rare ────────────────────────────────────────────────────────
  ['rose',             'Rose',               '🌹', 3],
  ['peony',            'Peony',              '🌸', 3],
  ['sweet_pea',        'Sweet Pea',          '🌸', 3],
  ['bird_of_paradise', 'Bird of Paradise',   '🌺', 3],
  ['lotus',            'Lotus',              '🪷', 3],
  ['orchid',           'Orchid',             '🌸', 3],
  ['night_bloomer',    'Night Bloomer',      '🌙', 3],
  ['moonflower',       'Moonflower',         '🌸', 3],
  ['heliconia',        'Heliconia',          '🌺', 3],
  ['calla_lily',       'Calla Lily',         '🌸', 3],
  ['torch_ginger',     'Torch Ginger',       '🌺', 3],
  ['amaryllis',        'Amaryllis',          '🌺', 3],
  ['gloriosa',         'Gloriosa',           '🌸', 3],
  ['crown_imperial',   'Crown Imperial',     '🌻', 3],
  ['christmas_cactus', 'Christmas Cactus',   '🌵', 3],
  ['jade_vine',        'Jade Vine',          '🌿', 3],
  ['black_bat_flower', 'Black Bat Flower',   '🌸', 3],
  ['ghost_orchid',     'Ghost Orchid',       '🌸', 3],
  ['corpse_flower',    'Corpse Flower',      '🍄', 3],
  ['blue_poppy',       'Blue Himalayan Poppy','🌸', 3],

  // ── Tier 4 : Epic ────────────────────────────────────────────────────────
  ['golden_lotus',     'Golden Lotus',       '🪷', 4],
  ['rainbow_rose',     'Rainbow Rose',       '🌹', 4],
  ['crystal_lily',     'Crystal Lily',       '🌸', 4],
  ['starlight_orchid', 'Starlight Orchid',   '🌸', 4],
  ['aurora_blossom',   'Aurora Blossom',     '🌸', 4],
  ['nebula_flower',    'Nebula Flower',      '🌸', 4],
  ['void_bloom',       'Void Bloom',         '🌸', 4],
  ['solar_flare',      'Solar Flare',        '🌺', 4],
  ['moon_petal',       'Moon Petal',         '🌸', 4],
  ['celestial_daisy',  'Celestial Daisy',    '🌼', 4],
  ['phoenix_flower',   'Phoenix Flower',     '🌺', 4],
  ['dragon_orchid',    'Dragon Orchid',      '🌸', 4],
  ['cosmic_rose',      'Cosmic Rose',        '🌹', 4],
  ['astral_bloom',     'Astral Bloom',       '🌸', 4],
  ['quantum_petal',    'Quantum Petal',      '🌸', 4],
  ['temporal_blossom', 'Temporal Blossom',   '🌸', 4],
  ['dimensional_flower','Dimensional Flower','🌸', 4],
  ['galactic_daisy',   'Galactic Daisy',     '🌼', 4],
  ['nova_bloom',       'Nova Bloom',         '🌸', 4],
  ['supernova_orchid', 'Supernova Orchid',   '🌸', 4],

  // ── Tier 5 : Legendary ───────────────────────────────────────────────────
  ['ancient_lotus',    'Ancient Lotus',      '🪷', 5],
  ['eternal_rose',     'Eternal Rose',       '🌹', 5],
  ['infinity_bloom',   'Infinity Bloom',     '🌸', 5],
  ['time_crystal',     'Time Crystal',       '💎', 5],
  ['void_lotus',       'Void Lotus',         '🪷', 5],
  ['cosmic_seed',      'Cosmic Seed',        '🌌', 5],
  ['reality_petal',    'Reality Petal',      '🌸', 5],
  ['universe_flower',  'Universe Flower',    '🌸', 5],
  ['omega_blossom',    'Omega Blossom',      '🌸', 5],
  ['last_flower',      'The Last Flower',    '🌸', 5],
  ['prismatic_rose',   'Prismatic Rose',     '🌹', 5],
  ['dream_orchid',     'Dream Orchid',       '🌸', 5],
  ['starborn_lily',    'Starborn Lily',      '🌸', 5],
  ['eclipse_bloom',    'Eclipse Bloom',      '🌸', 5],
  ['abyssal_flower',   'Abyssal Flower',     '🌸', 5],
  ['ethereal_lotus',   'Ethereal Lotus',     '🪷', 5],
  ['immortal_daisy',   'Immortal Daisy',     '🌼', 5],
  ['celestial_seed',   'Celestial Seed',     '🌸', 5],
  ['perfect_petal',    'Perfect Petal',      '🌸', 5],
  ['genesis_bloom',    'Genesis Bloom',      '🌸', 5],
]

// ─── Descriptions by tier ─────────────────────────────────────────────────────
const TIER_DESC = {
  1: (n, g, r) => `A common garden plant. Grows in ${Math.round(g/1000)}s for ${r} 🌸.`,
  2: (n, g, r) => `An uncommon bloom. Takes ${Math.round(g/1000)}s but yields ${r} 🌸.`,
  3: (n, g, r) => `A rare specimen. ${Math.round(g/60000)}min grow time, ${r} 🌸 reward.`,
  4: (n, g, r) => `An epic plant of cosmic beauty. ${Math.round(g/60000)}min, ${r.toLocaleString()} 🌸.`,
  5: (n, g, r) => `A legendary bloom. ${Math.round(g/3600000)}hr grow, ${r.toLocaleString()} 🌸.`,
}

// ─── Build PLANTS object ──────────────────────────────────────────────────────
function buildPlants() {
  const countByTier = {}
  const result = {}

  for (const [id, name, emoji, tier] of TEMPLATES) {
    if (!countByTier[tier]) countByTier[tier] = 0
    const idx = countByTier[tier]++
    const cfg = TIER_CFG[tier]

    const growTime  = Math.round(cfg.baseGrow   * Math.pow(cfg.growMult,   idx))
    const reward    = Math.round(cfg.baseReward  * Math.pow(cfg.rewardMult, idx))
    const seedCost  = id === 'daisy' ? 0 : Math.max(5, Math.round(reward * 0.9))
    const unlockCost = id === 'daisy' ? 0 : Math.round(reward * 10)

    result[id] = {
      id, name, emoji, tier,
      growTime, reward, seedCost, unlockCost,
      ...cfg.theme,
      description: TIER_DESC[tier](name, growTime, reward),
    }
  }
  return result
}

export const PLANTS = buildPlants()

// ─── 3-D visual config ────────────────────────────────────────────────────────
// modelType → how the plant renders in 3D
// Each plant has specific colours and a model archetype

const PLANT_VISUALS = {
  // ── Tier 1 Common ──────────────────────────────────────────────────────────
  daisy:          { model:'daisy',    petal:'#f5f5f5', center:'#fbbf24', stem:'#22c55e' },
  clover:         { model:'clover',   petal:'#4ade80', center:'#16a34a', stem:'#15803d' },
  dandelion:      { model:'dandelion',petal:'#fef08a', center:'#f59e0b', stem:'#22c55e' },
  violet:         { model:'daisy',    petal:'#a78bfa', center:'#7c3aed', stem:'#15803d' },
  chamomile:      { model:'daisy',    petal:'#fef9c3', center:'#f59e0b', stem:'#22c55e' },
  forget_me_not:  { model:'daisy',    petal:'#93c5fd', center:'#fbbf24', stem:'#15803d' },
  buttercup:      { model:'daisy',    petal:'#fde68a', center:'#d97706', stem:'#22c55e' },
  poppy:          { model:'poppy',    petal:'#f87171', center:'#1c1917', stem:'#22c55e' },
  marigold:       { model:'daisy',    petal:'#fb923c', center:'#ea580c', stem:'#15803d' },
  lavender:       { model:'spike',    petal:'#c084fc', center:'#7c3aed', stem:'#86efac' },
  pansy:          { model:'pansy',    petal:'#818cf8', center:'#fbbf24', stem:'#22c55e' },
  primrose:       { model:'daisy',    petal:'#fda4af', center:'#fbbf24', stem:'#15803d' },
  cornflower:     { model:'daisy',    petal:'#60a5fa', center:'#1d4ed8', stem:'#22c55e' },
  snapdragon:     { model:'spike',    petal:'#fb7185', center:'#be185d', stem:'#15803d' },
  aster:          { model:'daisy',    petal:'#e879f9', center:'#fbbf24', stem:'#22c55e' },
  zinnia:         { model:'daisy',    petal:'#f97316', center:'#dc2626', stem:'#15803d' },
  begonia:        { model:'daisy',    petal:'#f9a8d4', center:'#db2777', stem:'#22c55e' },
  cosmos:         { model:'daisy',    petal:'#fda4af', center:'#fbbf24', stem:'#15803d' },
  petunia:        { model:'tulip',    petal:'#c084fc', center:'#7c3aed', stem:'#22c55e' },
  lily_of_valley: { model:'bell',     petal:'#f0fdf4', center:'#bbf7d0', stem:'#22c55e' },

  // ── Tier 2 Uncommon ────────────────────────────────────────────────────────
  sunflower:      { model:'sunflower',petal:'#fde047', center:'#78350f', stem:'#15803d' },
  tulip:          { model:'tulip',    petal:'#f87171', center:'#dc2626', stem:'#22c55e' },
  dahlia:         { model:'dahlia',   petal:'#f472b6', center:'#be185d', stem:'#15803d' },
  carnation:      { model:'carnation',petal:'#fda4af', center:'#fb7185', stem:'#22c55e' },
  hydrangea:      { model:'ball',     petal:'#93c5fd', center:'#3b82f6', stem:'#15803d' },
  iris:           { model:'iris',     petal:'#818cf8', center:'#fbbf24', stem:'#22c55e' },
  chrysanthemum:  { model:'ball',     petal:'#fde68a', center:'#f59e0b', stem:'#15803d' },
  geranium:       { model:'daisy',    petal:'#f87171', center:'#fbbf24', stem:'#22c55e' },
  foxglove:       { model:'bell',     petal:'#c084fc', center:'#fbbf24', stem:'#15803d' },
  anemone:        { model:'daisy',    petal:'#f0abfc', center:'#1c1917', stem:'#22c55e' },
  camellia:       { model:'rose',     petal:'#fda4af', center:'#fbbf24', stem:'#15803d' },
  bleeding_heart: { model:'bell',     petal:'#fb7185', center:'#fda4af', stem:'#22c55e' },
  columbine:      { model:'bell',     petal:'#818cf8', center:'#fde68a', stem:'#15803d' },
  delphinium:     { model:'spike',    petal:'#60a5fa', center:'#1d4ed8', stem:'#22c55e' },
  freesia:        { model:'bell',     petal:'#fde68a', center:'#f59e0b', stem:'#15803d' },
  gardenia:       { model:'rose',     petal:'#f9fafb', center:'#fbbf24', stem:'#22c55e' },
  hibiscus:       { model:'hibiscus', petal:'#f87171', center:'#fde68a', stem:'#15803d' },
  jasmine:        { model:'daisy',    petal:'#fefce8', center:'#fbbf24', stem:'#22c55e' },
  magnolia:       { model:'tulip',    petal:'#fce7f3', center:'#fbbf24', stem:'#15803d' },
  wisteria:       { model:'spike',    petal:'#c084fc', center:'#7c3aed', stem:'#22c55e' },

  // ── Tier 3 Rare ────────────────────────────────────────────────────────────
  rose:           { model:'rose',     petal:'#f43f5e', center:'#fbbf24', stem:'#15803d' },
  peony:          { model:'carnation',petal:'#fda4af', center:'#fb7185', stem:'#15803d' },
  sweet_pea:      { model:'bell',     petal:'#f9a8d4', center:'#db2777', stem:'#22c55e' },
  bird_of_paradise:{ model:'hibiscus',petal:'#fb923c', center:'#1d4ed8', stem:'#15803d' },
  lotus:          { model:'lotus',    petal:'#fda4af', center:'#fbbf24', stem:'#22c55e' },
  orchid:         { model:'orchid',   petal:'#f0abfc', center:'#fbbf24', stem:'#15803d' },
  night_bloomer:  { model:'daisy',    petal:'#312e81', center:'#c7d2fe', stem:'#1e3a5f' },
  moonflower:     { model:'daisy',    petal:'#e0e7ff', center:'#fbbf24', stem:'#22c55e' },
  heliconia:      { model:'hibiscus', petal:'#f87171', center:'#fde047', stem:'#15803d' },
  calla_lily:     { model:'calla',    petal:'#fefce8', center:'#fbbf24', stem:'#22c55e' },
  torch_ginger:   { model:'spike',    petal:'#f87171', center:'#dc2626', stem:'#15803d' },
  amaryllis:      { model:'lily',     petal:'#f87171', center:'#fde047', stem:'#22c55e' },
  gloriosa:       { model:'lily',     petal:'#f97316', center:'#fde047', stem:'#15803d' },
  crown_imperial: { model:'bell',     petal:'#fb923c', center:'#fde047', stem:'#22c55e' },
  christmas_cactus:{ model:'cactus',  petal:'#f87171', center:'#fda4af', stem:'#22c55e' },
  jade_vine:      { model:'bell',     petal:'#4ade80', center:'#86efac', stem:'#15803d' },
  black_bat_flower:{ model:'orchid',  petal:'#1c1917', center:'#57534e', stem:'#15803d' },
  ghost_orchid:   { model:'orchid',   petal:'#f9fafb', center:'#e0e7ff', stem:'#22c55e' },
  corpse_flower:  { model:'mushroom', petal:'#78350f', center:'#92400e', stem:'#4ade80' },
  blue_poppy:     { model:'poppy',    petal:'#60a5fa', center:'#fbbf24', stem:'#22c55e' },

  // ── Tier 4 Epic ────────────────────────────────────────────────────────────
  golden_lotus:   { model:'lotus',    petal:'#fbbf24', center:'#f59e0b', stem:'#22c55e' },
  rainbow_rose:   { model:'rose',     petal:'#f472b6', center:'#fbbf24', stem:'#15803d' },
  crystal_lily:   { model:'crystal',  petal:'#bae6fd', center:'#e0f2fe', stem:'#22c55e' },
  starlight_orchid:{ model:'orchid',  petal:'#c7d2fe', center:'#fbbf24', stem:'#15803d' },
  aurora_blossom: { model:'lotus',    petal:'#a5f3fc', center:'#67e8f9', stem:'#22c55e' },
  nebula_flower:  { model:'star',     petal:'#818cf8', center:'#c7d2fe', stem:'#15803d' },
  void_bloom:     { model:'star',     petal:'#312e81', center:'#6366f1', stem:'#1e1b4b' },
  solar_flare:    { model:'sunflower',petal:'#fde047', center:'#dc2626', stem:'#15803d' },
  moon_petal:     { model:'lotus',    petal:'#e0e7ff', center:'#c7d2fe', stem:'#22c55e' },
  celestial_daisy:{ model:'star',     petal:'#fde68a', center:'#fbbf24', stem:'#15803d' },
  phoenix_flower: { model:'hibiscus', petal:'#f97316', center:'#dc2626', stem:'#15803d' },
  dragon_orchid:  { model:'orchid',   petal:'#f97316', center:'#fde047', stem:'#15803d' },
  cosmic_rose:    { model:'rose',     petal:'#818cf8', center:'#fbbf24', stem:'#1e1b4b' },
  astral_bloom:   { model:'star',     petal:'#a5b4fc', center:'#c7d2fe', stem:'#15803d' },
  quantum_petal:  { model:'crystal',  petal:'#67e8f9', center:'#e0f2fe', stem:'#22c55e' },
  temporal_blossom:{ model:'star',    petal:'#fde68a', center:'#fbbf24', stem:'#15803d' },
  dimensional_flower:{ model:'crystal',petal:'#f0abfc',center:'#fbbf24',stem:'#15803d' },
  galactic_daisy: { model:'star',     petal:'#818cf8', center:'#fbbf24', stem:'#1e1b4b' },
  nova_bloom:     { model:'lotus',    petal:'#f9a8d4', center:'#fbbf24', stem:'#22c55e' },
  supernova_orchid:{ model:'orchid',  petal:'#fde68a', center:'#f59e0b', stem:'#15803d' },

  // ── Tier 5 Legendary ───────────────────────────────────────────────────────
  ancient_lotus:  { model:'lotus',    petal:'#fbbf24', center:'#d97706', stem:'#15803d' },
  eternal_rose:   { model:'rose',     petal:'#f43f5e', center:'#7c3aed', stem:'#1e1b4b' },
  infinity_bloom: { model:'crystal',  petal:'#c7d2fe', center:'#f9fafb', stem:'#22c55e' },
  time_crystal:   { model:'crystal',  petal:'#bae6fd', center:'#f9fafb', stem:'#22c55e' },
  void_lotus:     { model:'lotus',    petal:'#312e81', center:'#6366f1', stem:'#1e1b4b' },
  cosmic_seed:    { model:'crystal',  petal:'#818cf8', center:'#c7d2fe', stem:'#1e1b4b' },
  reality_petal:  { model:'star',     petal:'#f9fafb', center:'#fbbf24', stem:'#15803d' },
  universe_flower:{ model:'star',     petal:'#bae6fd', center:'#fbbf24', stem:'#1e1b4b' },
  omega_blossom:  { model:'lotus',    petal:'#f0abfc', center:'#fbbf24', stem:'#15803d' },
  last_flower:    { model:'rose',     petal:'#fef9c3', center:'#fbbf24', stem:'#22c55e' },
  prismatic_rose: { model:'rose',     petal:'#f472b6', center:'#fbbf24', stem:'#15803d' },
  dream_orchid:   { model:'orchid',   petal:'#f9a8d4', center:'#fbbf24', stem:'#22c55e' },
  starborn_lily:  { model:'lily',     petal:'#fde68a', center:'#fbbf24', stem:'#15803d' },
  eclipse_bloom:  { model:'star',     petal:'#1c1917', center:'#fbbf24', stem:'#1e1b4b' },
  abyssal_flower: { model:'mushroom', petal:'#1c1917', center:'#312e81', stem:'#1e1b4b' },
  ethereal_lotus: { model:'lotus',    petal:'#f0f9ff', center:'#bae6fd', stem:'#22c55e' },
  immortal_daisy: { model:'daisy',    petal:'#fef9c3', center:'#fbbf24', stem:'#22c55e' },
  celestial_seed: { model:'crystal',  petal:'#fde68a', center:'#f9fafb', stem:'#15803d' },
  perfect_petal:  { model:'lotus',    petal:'#fef9c3', center:'#fbbf24', stem:'#22c55e' },
  genesis_bloom:  { model:'star',     petal:'#f9fafb', center:'#fbbf24', stem:'#15803d' },
}

export function getPlantVisual(plantId) {
  if (!plantId) return { model:'daisy', petal:'#fef08a', center:'#f59e0b', stem:'#22c55e' }
  return PLANT_VISUALS[plantId] || { model:'daisy', petal:'#fef08a', center:'#f59e0b', stem:'#22c55e' }
}

// Default starter set for new profiles
export const DEFAULT_UNLOCKED = new Set(['daisy'])
export const DEFAULT_OWNED_SEEDS = Object.fromEntries(
  Object.keys(PLANTS).map(id => [id, id === 'daisy' ? 99 : 0])
)
