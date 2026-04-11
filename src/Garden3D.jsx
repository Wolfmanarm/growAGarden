import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getPlantVisual } from './plants'

const PLOT_SPACING = 1.9

// ─── Ground + sky ─────────────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color="#86efac" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[55, 55]} />
        <meshLambertMaterial color="#c4a46b" />
      </mesh>
    </group>
  )
}

// ─── Clouds ───────────────────────────────────────────────────────────────────
function Cloud({ position, speed }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.position.x += speed
      if (ref.current.position.x > 30) ref.current.position.x = -30
    }
  })
  return (
    <group ref={ref} position={position}>
      {[
        [0, 0, 0, 1.3],
        [1.4, 0.25, 0, 1.0],
        [-1.4, 0.1, 0, 0.95],
        [0.6, 0.7, 0, 0.85],
        [-0.6, 0.6, 0, 0.8],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 8, 8]} />
          <meshLambertMaterial color="white" />
        </mesh>
      ))}
    </group>
  )
}

function Clouds() {
  const data = useMemo(() => [
    { pos: [-10, 14, -12], speed: 0.012 },
    { pos: [6, 16, -18], speed: 0.009 },
    { pos: [18, 13, -8], speed: 0.014 },
    { pos: [-20, 15, -5], speed: 0.008 },
  ], [])
  return <>{data.map((d, i) => <Cloud key={i} position={d.pos} speed={d.speed} />)}</>
}

// ─── Fence ────────────────────────────────────────────────────────────────────
function FencePost({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.12, 1.1, 0.12]} />
        <meshLambertMaterial color="#d97706" />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <coneGeometry args={[0.1, 0.18, 4]} />
        <meshLambertMaterial color="#b45309" />
      </mesh>
    </group>
  )
}

function Fence({ totalRows }) {
  const hw = 5.1   // half-width (x axis)
  const hh = ((totalRows - 1) / 2) * PLOT_SPACING + 1.1  // half-height (z axis)

  // Rail helper
  const Rail = ({ pos, rot, len }) => (
    <mesh position={pos} rotation={rot} castShadow>
      <boxGeometry args={[len, 0.07, 0.07]} />
      <meshLambertMaterial color="#d97706" />
    </mesh>
  )

  const frontZ = hh, backZ = -hh

  return (
    <group>
      {/* Front fence */}
      {[-2, -1, 0, 1, 2].map(i => <FencePost key={`f${i}`} x={i * PLOT_SPACING} z={frontZ} />)}
      <Rail pos={[0, 0.4, frontZ]} rot={[0, 0, 0]} len={hw * 2} />
      <Rail pos={[0, 0.7, frontZ]} rot={[0, 0, 0]} len={hw * 2} />

      {/* Back fence */}
      {[-2, -1, 0, 1, 2].map(i => <FencePost key={`b${i}`} x={i * PLOT_SPACING} z={backZ} />)}
      <Rail pos={[0, 0.4, backZ]} rot={[0, 0, 0]} len={hw * 2} />
      <Rail pos={[0, 0.7, backZ]} rot={[0, 0, 0]} len={hw * 2} />

      {/* Left fence */}
      {Array.from({ length: totalRows }).map((_, r) => {
        const z = (r - (totalRows - 1) / 2) * PLOT_SPACING
        return <FencePost key={`l${r}`} x={-hw} z={z} />
      })}
      <Rail pos={[-hw, 0.4, 0]} rot={[0, Math.PI / 2, 0]} len={hh * 2} />
      <Rail pos={[-hw, 0.7, 0]} rot={[0, Math.PI / 2, 0]} len={hh * 2} />

      {/* Right fence */}
      {Array.from({ length: totalRows }).map((_, r) => {
        const z = (r - (totalRows - 1) / 2) * PLOT_SPACING
        return <FencePost key={`r${r}`} x={hw} z={z} />
      })}
      <Rail pos={[hw, 0.4, 0]} rot={[0, Math.PI / 2, 0]} len={hh * 2} />
      <Rail pos={[hw, 0.7, 0]} rot={[0, Math.PI / 2, 0]} len={hh * 2} />
    </group>
  )
}

// ─── Plant 3-D model ──────────────────────────────────────────────────────────
function PlantModel({ seedId, progress, isReady, onClick }) {
  const groupRef = useRef()
  const cfg = getPlantVisual(seedId)
  const scale = 0.15 + progress * 0.85

  useFrame(({ clock }) => {
    if (groupRef.current && isReady) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.04
    }
  })

  if (cfg.type === 'mushroom') {
    return (
      <group ref={groupRef} scale={scale} position={[0, 0.06, 0]} onClick={onClick}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.17, 0.6, 8]} />
          <meshLambertMaterial color={cfg.stem} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <sphereGeometry args={[0.4, 9, 9, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color={cfg.petal} />
        </mesh>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[
            Math.sin(i * 2.1) * 0.22, 0.78, Math.cos(i * 2.1) * 0.22
          ]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshLambertMaterial color="white" />
          </mesh>
        ))}
      </group>
    )
  }

  const stemH = seedId === 'sunflower' ? 0.75 : 0.6
  const flowerY = seedId === 'sunflower' ? 0.9 : 0.72
  const pRadius = seedId === 'sunflower' ? 0.24 : 0.15
  const cRadius = seedId === 'sunflower' ? 0.15 : 0.1
  const pSize   = seedId === 'sunflower' ? 0.14 : 0.12

  return (
    <group ref={groupRef} scale={scale} position={[0, 0.06, 0]} onClick={onClick}>
      {/* Stem */}
      <mesh position={[0, stemH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, stemH, 6]} />
        <meshLambertMaterial color={cfg.stem} />
      </mesh>
      {/* Leaf */}
      <mesh position={[0.17, stemH * 0.5, 0]} rotation={[0, 0, 0.8]} castShadow>
        <boxGeometry args={[0.26, 0.08, 0.12]} />
        <meshLambertMaterial color={cfg.stem} />
      </mesh>
      {/* Petals */}
      {Array.from({ length: cfg.petals }).map((_, i) => (
        <mesh key={i} position={[
          Math.sin(i / cfg.petals * Math.PI * 2) * pRadius,
          flowerY,
          Math.cos(i / cfg.petals * Math.PI * 2) * pRadius,
        ]} castShadow>
          <sphereGeometry args={[pSize, 6, 6]} />
          <meshLambertMaterial color={cfg.petal} />
        </mesh>
      ))}
      {/* Centre */}
      <mesh position={[0, flowerY, 0]} castShadow>
        <sphereGeometry args={[cRadius, 7, 7]} />
        <meshLambertMaterial color={cfg.center} />
      </mesh>
    </group>
  )
}

// ─── Ready sparkle ────────────────────────────────────────────────────────────
function ReadySparkle() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 2.8
      ref.current.position.y = 1.1 + Math.sin(clock.elapsedTime * 3.5) * 0.08
    }
  })
  return (
    <mesh ref={ref} position={[0, 1.1, 0]}>
      <octahedronGeometry args={[0.14]} />
      <meshLambertMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
    </mesh>
  )
}

// ─── 3-D progress bar ─────────────────────────────────────────────────────────
function ProgressBar3D({ progress }) {
  if (progress <= 0.01 || progress >= 1) return null
  return (
    <group position={[0, 0.13, 0.78]}>
      <mesh>
        <boxGeometry args={[1.0, 0.07, 0.04]} />
        <meshLambertMaterial color="#374151" />
      </mesh>
      <mesh position={[-(1 - progress) * 0.5, 0, 0.02]} scale={[progress, 1, 1]}>
        <boxGeometry args={[1.0, 0.07, 0.04]} />
        <meshLambertMaterial color="#4ade80" />
      </mesh>
    </group>
  )
}

// ─── Single garden plot ───────────────────────────────────────────────────────
function GardenPlot({ index, plot, onPlotClick, totalRows }) {
  const col = index % 5
  const row = Math.floor(index / 5)
  const x = (col - 2) * PLOT_SPACING
  const z = (row - (totalRows - 1) / 2) * PLOT_SPACING

  const [progress, setProgress] = useState(() => {
    if (!plot) return 0
    if (plot.state === 'ready') return 1
    const elapsed = (plot.elapsed || 0) + (Date.now() - (plot.savedAt || Date.now()))
    return Math.min(elapsed / plot.totalGrowTime, 1)
  })

  useEffect(() => {
    if (!plot) { setProgress(0); return }
    if (plot.state === 'ready') { setProgress(1); return }
    const startedAt = Date.now()
    const baseElapsed = plot.elapsed || 0
    const id = setInterval(() => {
      const p = Math.min((baseElapsed + (Date.now() - startedAt)) / plot.totalGrowTime, 1)
      setProgress(p)
    }, 150)
    return () => clearInterval(id)
  }, [plot])

  const isReady = !!(plot && (plot.state === 'ready' || progress >= 1))
  const soilColor = !plot ? '#92400e' : isReady ? '#4ade80' : '#7c5b35'

  const handleClick = (e) => {
    e.stopPropagation()
    onPlotClick(index)
  }

  return (
    <group position={[x, 0, z]}>
      {/* Raised border */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[1.62, 0.07, 1.62]} />
        <meshLambertMaterial color="#44403c" />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.03, 0]} receiveShadow onClick={handleClick}>
        <boxGeometry args={[1.5, 0.1, 1.5]} />
        <meshLambertMaterial color={soilColor} />
      </mesh>

      {plot && (
        <PlantModel
          seedId={plot.seedId}
          progress={progress}
          isReady={isReady}
          onClick={handleClick}
        />
      )}
      {isReady && <ReadySparkle />}
      {plot && !isReady && <ProgressBar3D progress={progress} />}
    </group>
  )
}

// ─── Player character (blocky / Minecraft-style) ──────────────────────────────
function PlayerCharacter({ playerRef }) {
  const leftLegRef  = useRef()
  const rightLegRef = useRef()
  const leftArmRef  = useRef()
  const rightArmRef = useRef()
  // Expose moving state so limb swing can read it without re-render
  const movingRef = playerRef._movingRef || (playerRef._movingRef = { current: false })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const swing = movingRef.current ? Math.sin(t * 9) * 0.38 : 0
    if (leftLegRef.current)  leftLegRef.current.rotation.x  =  swing
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
    if (leftArmRef.current)  leftArmRef.current.rotation.x  = -swing * 0.6
    if (rightArmRef.current) rightArmRef.current.rotation.x =  swing * 0.3 - 0.18
  })

  return (
    <group ref={playerRef}>
      {/* ── Legs ── */}
      {[[-0.155, 0], [0.155, 1]].map(([lx, k]) => (
        <group key={k} ref={k === 0 ? leftLegRef : rightLegRef} position={[lx, 0.5, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <boxGeometry args={[0.22, 0.52, 0.22]} />
            <meshLambertMaterial color="#60a5fa" />
          </mesh>
          {/* Boot */}
          <mesh position={[0, -0.54, 0.04]} castShadow>
            <boxGeometry args={[0.24, 0.1, 0.28]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
        </group>
      ))}

      {/* ── Torso ── */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.56, 0.62, 0.3]} />
        <meshLambertMaterial color="#6ee7b7" />
      </mesh>
      {/* Overalls bib */}
      <mesh position={[0, 0.96, 0.16]}>
        <boxGeometry args={[0.34, 0.42, 0.02]} />
        <meshLambertMaterial color="#34d399" />
      </mesh>
      {/* Pocket */}
      <mesh position={[0, 0.82, 0.165]}>
        <boxGeometry args={[0.14, 0.12, 0.01]} />
        <meshLambertMaterial color="#10b981" />
      </mesh>

      {/* ── Left arm ── */}
      <group ref={leftArmRef} position={[-0.39, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.18, 0.46, 0.2]} />
          <meshLambertMaterial color="#fde68a" />
        </mesh>
      </group>

      {/* ── Right arm + shovel ── */}
      <group ref={rightArmRef} position={[0.39, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.18, 0.46, 0.2]} />
          <meshLambertMaterial color="#fde68a" />
        </mesh>
        {/* Handle */}
        <mesh position={[0.15, -0.32, -0.1]} rotation={[0.3, 0, 0.38]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.15, 8]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
        {/* Blade */}
        <mesh position={[0.42, -0.83, -0.21]} rotation={[0.3, 0, 0.38]} castShadow>
          <boxGeometry args={[0.24, 0.22, 0.04]} />
          <meshLambertMaterial color="#94a3b8" />
        </mesh>
        {/* Blade sheen */}
        <mesh position={[0.42, -0.83, -0.19]} rotation={[0.3, 0, 0.38]}>
          <boxGeometry args={[0.20, 0.18, 0.01]} />
          <meshLambertMaterial color="#cbd5e1" />
        </mesh>
      </group>

      {/* ── Head ── */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.4]} />
        <meshLambertMaterial color="#fde68a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.11, 1.44, 0.21]}>
        <boxGeometry args={[0.09, 0.09, 0.01]} />
        <meshLambertMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.11, 1.44, 0.21]}>
        <boxGeometry args={[0.09, 0.09, 0.01]} />
        <meshLambertMaterial color="#1e293b" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, 1.34, 0.21]}>
        <boxGeometry args={[0.13, 0.04, 0.01]} />
        <meshLambertMaterial color="#1e293b" />
      </mesh>
      {/* Cheeks */}
      <mesh position={[-0.16, 1.36, 0.21]}>
        <boxGeometry args={[0.06, 0.05, 0.01]} />
        <meshLambertMaterial color="#fca5a5" />
      </mesh>
      <mesh position={[0.16, 1.36, 0.21]}>
        <boxGeometry args={[0.06, 0.05, 0.01]} />
        <meshLambertMaterial color="#fca5a5" />
      </mesh>

      {/* ── Hat ── */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.06, 12]} />
        <meshLambertMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.25, 0.58, 10]} />
        <meshLambertMaterial color="#22c55e" />
      </mesh>
      {/* Hat ribbon */}
      <mesh position={[0, 1.66, 0]}>
        <cylinderGeometry args={[0.252, 0.252, 0.09, 10]} />
        <meshLambertMaterial color="#fbbf24" />
      </mesh>
    </group>
  )
}

// ─── Movement + camera controller ────────────────────────────────────────────
const _camTarget = new THREE.Vector3()
const _lookAt    = new THREE.Vector3()
const MOVE_SPEED  = 4.5
const TURN_SPEED  = 2.4   // radians / second — smooth turning (task 6)

function GameScene({ plots, selectedSeed, onPlotClick, profile }) {
  const playerRef = useRef()
  const playerPos = useRef(new THREE.Vector3(0, 0, 6))
  const playerRot = useRef(Math.PI)   // facing camera initially
  const keys = useRef({})
  const movingRef = useRef(false)
  const totalRows = 5 + (profile?.extraRows || 0)

  // Keyboard input
  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true }
    const up   = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  // Attach movingRef to playerRef so PlayerCharacter can read it
  useEffect(() => {
    if (playerRef.current) playerRef.current._movingRef = movingRef
  })

  useFrame(({ camera }, delta) => {
    // ── Task 6: smooth turning — A/D rotate, W/S move forward/back ──
    const turnLeft  = keys.current['KeyA'] || keys.current['ArrowLeft']
    const turnRight = keys.current['KeyD'] || keys.current['ArrowRight']
    const fwd       = keys.current['KeyW'] || keys.current['ArrowUp']
    const back      = keys.current['KeyS'] || keys.current['ArrowDown']

    if (turnLeft)  playerRot.current += TURN_SPEED * delta
    if (turnRight) playerRot.current -= TURN_SPEED * delta

    let moveDir = 0
    if (fwd)  moveDir += 1
    if (back) moveDir -= 1

    const moving = moveDir !== 0 || turnLeft || turnRight
    movingRef.current = moveDir !== 0   // legs swing only when translating

    if (moveDir !== 0) {
      const r = playerRot.current
      // Forward direction: (sin r, 0, cos r) when camera is at -cos r
      playerPos.current.x = Math.max(-12, Math.min(12,
        playerPos.current.x + Math.sin(r) * moveDir * MOVE_SPEED * delta))
      playerPos.current.z = Math.max(-12, Math.min(12,
        playerPos.current.z + Math.cos(r) * moveDir * MOVE_SPEED * delta))
    }

    if (playerRef.current) {
      playerRef.current.position.copy(playerPos.current)
      playerRef.current.rotation.y = playerRot.current
    }

    // Third-person camera: float behind + above the player
    const a = playerRot.current
    _camTarget.set(
      playerPos.current.x - Math.sin(a) * 7,
      playerPos.current.y + 5.5,
      playerPos.current.z - Math.cos(a) * 7,
    )
    camera.position.lerp(_camTarget, 0.07)
    _lookAt.set(playerPos.current.x, playerPos.current.y + 1.4, playerPos.current.z)
    camera.lookAt(_lookAt)
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 16, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <directionalLight position={[-8, 6, -5]} intensity={0.3} />

      {/* Sky + fog */}
      <color attach="background" args={['#7dd3fc']} />
      <fog attach="fog" args={['#bae6fd', 30, 55]} />

      <Ground />
      <Clouds />
      <Fence totalRows={totalRows} />

      {/* Garden plots */}
      {Array.from({ length: totalRows * 5 }).map((_, i) => (
        <GardenPlot
          key={i}
          index={i}
          plot={plots[i] ?? null}
          onPlotClick={onPlotClick}
          totalRows={totalRows}
        />
      ))}

      <PlayerCharacter playerRef={playerRef} />
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function Garden3D({ plots, selectedSeed, onPlotClick, profile }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 13], fov: 55 }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <GameScene
        plots={plots}
        selectedSeed={selectedSeed}
        onPlotClick={onPlotClick}
        profile={profile}
      />
    </Canvas>
  )
}
