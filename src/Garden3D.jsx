import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getPlantVisual } from './plants'

const PLOT_SPACING   = 1.9
const HOUSE_POS      = [-11, 0, 0]
const WILD_BOUNDARY  = -14     // z < this = wilderness
const CASTLE_ENTRY_Z = 13      // z > this = castle grounds

// Castle NPC positions
const CASTLE_NPCS = [
  { id: 'weapons',   x: -5, z: 17, color: '#dc2626', sign: '⚔️ Weapons',   name: 'Felix'  },
  { id: 'carpentry', x:  5, z: 17, color: '#92400e', sign: '🔨 Carpentry', name: 'Benny'  },
  { id: 'potions',   x: -5, z: 23, color: '#7c3aed', sign: '🧪 Potions',   name: 'Elara'  },
  { id: 'general',   x:  5, z: 23, color: '#15803d', sign: '🛒 General',   name: 'Maggie' },
]

// All possible wilderness spawn positions (daytime + night extras)
const ALL_SPAWN_POS = [
  [-4,-20], [4,-22], [-6,-25], [2,-18], [-2,-28], [6,-23],
  [-8,-16], [8,-19], [-10,-24], [10,-26], [-3,-32], [5,-30],
  [-7,-21], [3,-25], [-12,-18], [12,-22], [-5,-35], [7,-17],
]

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
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
      if (ref.current.position.x > 35) ref.current.position.x = -35
    }
  })
  return (
    <group ref={ref} position={position}>
      {[[0,0,0,1.3],[1.4,.25,0,1],[-1.4,.1,0,.95],[.6,.7,0,.85],[-.6,.6,0,.8]].map(([x,y,z,r],i)=>(
        <mesh key={i} position={[x,y,z]}>
          <sphereGeometry args={[r,8,8]}/>
          <meshLambertMaterial color="white"/>
        </mesh>
      ))}
    </group>
  )
}
function Clouds() {
  const data = useMemo(()=>[
    {pos:[-12,14,-14],speed:.012},{pos:[8,16,-20],speed:.009},
    {pos:[20,13,-9],speed:.014},{pos:[-22,15,-6],speed:.008},
  ],[])
  return <>{data.map((d,i)=><Cloud key={i} position={d.pos} speed={d.speed}/>)}</>
}

// ─── Fence ────────────────────────────────────────────────────────────────────
function FencePost({x,z}) {
  return (
    <group position={[x,0,z]}>
      <mesh position={[0,.55,0]} castShadow>
        <boxGeometry args={[.12,1.1,.12]}/>
        <meshLambertMaterial color="#d97706"/>
      </mesh>
      <mesh position={[0,1.08,0]}>
        <coneGeometry args={[.1,.18,4]}/>
        <meshLambertMaterial color="#b45309"/>
      </mesh>
    </group>
  )
}
function Fence({totalCols = 5}) {
  // Fixed 5 rows in z; variable cols in x (expanding east)
  const hh    = 4.9                                        // half-height (z) — fixed
  const left  = -4.9                                       // left edge — fixed
  const right = (totalCols - 3) * PLOT_SPACING + 1.1      // right edge grows with cols
  const cx    = (left + right) / 2                         // center x of fence
  const hw    = (right - left) / 2                         // half-width

  const Rail = ({pos,rot,len}) => (
    <mesh position={pos} rotation={rot} castShadow>
      <boxGeometry args={[len,.07,.07]}/>
      <meshLambertMaterial color="#d97706"/>
    </mesh>
  )

  // Posts along north/south edges
  const colPosts = Array.from({length: totalCols}, (_, c) => (c - 2) * PLOT_SPACING)

  return (
    <group>
      {/* North fence */}
      {colPosts.map((xp, i) => <FencePost key={`f${i}`} x={xp} z={hh}/>)}
      <Rail pos={[cx, .4, hh]}  rot={[0,0,0]}        len={hw*2}/>
      <Rail pos={[cx, .7, hh]}  rot={[0,0,0]}        len={hw*2}/>
      {/* South fence */}
      {colPosts.map((xp, i) => <FencePost key={`b${i}`} x={xp} z={-hh}/>)}
      <Rail pos={[cx, .4,-hh]}  rot={[0,0,0]}        len={hw*2}/>
      <Rail pos={[cx, .7,-hh]}  rot={[0,0,0]}        len={hw*2}/>
      {/* West fence (fixed) */}
      {[-2,-1,0,1,2].map((_,r) => {
        const zp = (r - 2) * PLOT_SPACING
        return <FencePost key={`l${r}`} x={left} z={zp}/>
      })}
      <Rail pos={[left,.4,0]}   rot={[0,Math.PI/2,0]} len={hh*2}/>
      <Rail pos={[left,.7,0]}   rot={[0,Math.PI/2,0]} len={hh*2}/>
      {/* East fence (grows with cols) */}
      {[-2,-1,0,1,2].map((_,r) => {
        const zp = (r - 2) * PLOT_SPACING
        return <FencePost key={`r${r}`} x={right} z={zp}/>
      })}
      <Rail pos={[right,.4,0]}  rot={[0,Math.PI/2,0]} len={hh*2}/>
      <Rail pos={[right,.7,0]}  rot={[0,Math.PI/2,0]} len={hh*2}/>
    </group>
  )
}

// ─── Cabin House ──────────────────────────────────────────────────────────────
function House3D({ onEnter, houseLevel = 0 }) {
  const logA   = houseLevel >= 3 ? '#7c3a20' : '#6B3012'
  const logB   = houseLevel >= 3 ? '#8B4220' : '#7c3a20'
  const chink  = '#c4956a'
  const roof   = houseLevel >= 4 ? '#312e81' : houseLevel >= 2 ? '#1c1917' : '#3b1a0a'
  const roofTrim = houseLevel >= 4 ? '#4338ca' : '#57534e'

  return (
    <group position={HOUSE_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* Stone foundation with border */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <boxGeometry args={[5.0, 0.16, 4.4]} />
        <meshLambertMaterial color="#6b6560" />
      </mesh>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[4.7, 0.08, 4.1]} />
        <meshLambertMaterial color="#78716c" />
      </mesh>

      {/* Log walls — 7 stacked layers */}
      {[0,1,2,3,4,5,6].map(i => (
        <mesh key={i} position={[0, 0.22 + i * 0.34, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.30, 3.8]} />
          <meshLambertMaterial color={i % 2 === 0 ? logA : logB} />
        </mesh>
      ))}
      {/* Chinking between logs */}
      {[1,2,3,4,5,6].map(i => (
        <mesh key={i} position={[0, 0.37 + (i-1) * 0.34, 0]}>
          <boxGeometry args={[4.42, 0.055, 3.82]} />
          <meshLambertMaterial color={chink} />
        </mesh>
      ))}

      {/* Gable ends (triangular log fill) */}
      {[-2.18, 2.18].map((zp, i) => (
        <group key={i}>
          {[0,1,2].map(j => (
            <mesh key={j} position={[0, 2.6 + j * 0.34, zp]} castShadow>
              <boxGeometry args={[4.4 - j * 0.9, 0.30, 0.18]} />
              <meshLambertMaterial color={j % 2 === 0 ? logA : logB} />
            </mesh>
          ))}
        </group>
      ))}

      {/* A-frame roof — left & right panels */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[0, 3.05, s * 1.55]} rotation={[s * 0.72, 0, 0]} castShadow>
          <boxGeometry args={[4.7, 0.14, 2.3]} />
          <meshLambertMaterial color={roof} />
        </mesh>
      ))}
      {/* Roof base slab */}
      <mesh position={[0, 2.42, 0]} castShadow>
        <boxGeometry args={[4.6, 0.12, 4.0]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Ridge beam */}
      <mesh position={[0, 3.84, 0]} castShadow>
        <boxGeometry args={[4.9, 0.22, 0.26]} />
        <meshLambertMaterial color="#1c1917" />
      </mesh>
      {/* Roof trim strips */}
      {[[-2.22, 0], [2.22, 0]].map(([zp], i) => (
        <mesh key={i} position={[0, 2.44, zp]} castShadow>
          <boxGeometry args={[4.7, 0.12, 0.18]} />
          <meshLambertMaterial color={roofTrim} />
        </mesh>
      ))}

      {/* Porch floor */}
      <mesh position={[0, 0.19, 2.5]} receiveShadow>
        <boxGeometry args={[3.8, 0.1, 1.1]} />
        <meshLambertMaterial color="#92400e" />
      </mesh>
      {/* Porch planks grain */}
      {[-1.2, -0.4, 0.4, 1.2].map((xp, i) => (
        <mesh key={i} position={[xp, 0.245, 2.5]}>
          <boxGeometry args={[0.72, 0.01, 1.0]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
      ))}
      {/* Porch posts */}
      {[-1.5, 1.5].map((xp, i) => (
        <mesh key={i} position={[xp, 1.05, 2.42]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 2.1, 8]} />
          <meshLambertMaterial color={logA} />
        </mesh>
      ))}
      {/* Porch cross-beam */}
      <mesh position={[0, 2.11, 2.42]} castShadow>
        <boxGeometry args={[3.5, 0.18, 0.18]} />
        <meshLambertMaterial color={logA} />
      </mesh>
      {/* Porch railing */}
      <mesh position={[0, 0.72, 2.98]} castShadow>
        <boxGeometry args={[3.0, 0.08, 0.06]} />
        <meshLambertMaterial color={logB} />
      </mesh>
      {[-1.1, -0.55, 0, 0.55, 1.1].map((xp, i) => (
        <mesh key={i} position={[xp, 0.48, 2.98]} castShadow>
          <boxGeometry args={[0.06, 0.44, 0.06]} />
          <meshLambertMaterial color={logB} />
        </mesh>
      ))}

      {/* Door (clickable) */}
      <mesh position={[0, 0.95, 1.92]} onClick={onEnter} castShadow>
        <boxGeometry args={[0.92, 1.7, 0.1]} />
        <meshLambertMaterial color="#7c2d12" />
      </mesh>
      {[-0.21, 0.21].map((xp, i) => (
        <mesh key={i} position={[xp, 0.95, 1.98]}>
          <boxGeometry args={[0.36, 1.56, 0.04]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
      ))}
      {/* Door crossbar */}
      <mesh position={[0, 1.15, 1.99]}>
        <boxGeometry args={[0.88, 0.05, 0.03]} />
        <meshLambertMaterial color="#92400e" />
      </mesh>
      {/* Door knob */}
      <mesh position={[0.3, 0.82, 2.0]}>
        <sphereGeometry args={[0.065, 8, 8]} /><meshLambertMaterial color="#fbbf24" />
      </mesh>

      {/* Front windows */}
      {[-1.35, 1.35].map((xp, i) => (
        <group key={i} position={[xp, 1.35, 1.92]}>
          {/* Frame */}
          <mesh castShadow>
            <boxGeometry args={[0.66, 0.58, 0.1]} />
            <meshLambertMaterial color={logA} />
          </mesh>
          {/* Glass */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.52, 0.44, 0.04]} />
            <meshLambertMaterial color="#bae6fd" transparent opacity={0.75}/>
          </mesh>
          {/* Cross divider */}
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.06, 0.44, 0.02]} /><meshLambertMaterial color="#fff"/>
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.52, 0.06, 0.02]} /><meshLambertMaterial color="#fff"/>
          </mesh>
        </group>
      ))}

      {/* Side windows */}
      {[-0.8, 0.8].map((zp, i) => (
        <group key={i} position={[2.21, 1.3, zp]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.5, 0.55]} />
            <meshLambertMaterial color={logA} />
          </mesh>
          <mesh position={[0.05, 0, 0]}>
            <boxGeometry args={[0.04, 0.38, 0.42]} />
            <meshLambertMaterial color="#bae6fd" transparent opacity={0.7}/>
          </mesh>
        </group>
      ))}

      {/* Stone chimney */}
      <mesh position={[1.4, 2.9, -0.8]} castShadow>
        <boxGeometry args={[0.65, 1.4, 0.65]} /><meshLambertMaterial color="#57534e" />
      </mesh>
      {/* Chimney cap */}
      <mesh position={[1.4, 3.64, -0.8]} castShadow>
        <boxGeometry args={[0.82, 0.12, 0.82]} /><meshLambertMaterial color="#44403c" />
      </mesh>
      {/* Smoke (decorative) */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[1.4, 3.82 + i * 0.28, -0.8 + i * 0.05]}>
          <sphereGeometry args={[0.14 + i * 0.06, 5, 5]}/>
          <meshLambertMaterial color="#9ca3af" transparent opacity={0.3 - i * 0.08}/>
        </mesh>
      ))}

      {/* Stone path leading away */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.17, 3.1 + i * 0.56]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <boxGeometry args={[0.6, 0.4, 0.04]} />
          <meshLambertMaterial color="#a8a29e" />
        </mesh>
      ))}

      {/* Flower boxes on porch */}
      {[-1.2, 0, 1.2].map((xp, i) => (
        <group key={i} position={[xp, 0.28, 2.98]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.2, 0.22]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.44, 0.14, 0.16]} />
            <meshLambertMaterial color="#4a7c42" />
          </mesh>
          {/* Small flowers */}
          {[-0.12, 0.12].map((fx, j) => (
            <mesh key={j} position={[fx, 0.3, 0]}>
              <sphereGeometry args={[0.06, 5, 5]}/>
              <meshLambertMaterial color={['#f87171','#fbbf24','#a78bfa'][i]}/>
            </mesh>
          ))}
        </group>
      ))}

      {/* Mailbox post */}
      <group position={[1.9, 0, 3.1]}>
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.1, 0.72, 0.1]} /><meshLambertMaterial color={logA} />
        </mesh>
        {/* Box body */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.22, 0.24]} /><meshLambertMaterial color="#1d4ed8" />
        </mesh>
        {/* Box lid */}
        <mesh position={[0, 1.12, -0.08]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.38, 0.04, 0.16]} /><meshLambertMaterial color="#1e40af" />
        </mesh>
        {/* Flag */}
        <mesh position={[0.2, 1.06, 0.06]}>
          <boxGeometry args={[0.03, 0.22, 0.02]} /><meshLambertMaterial color="#6b7280" />
        </mesh>
        <mesh position={[0.29, 1.18, 0.06]}>
          <boxGeometry args={[0.16, 0.1, 0.02]} /><meshLambertMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* House level badge */}
      {houseLevel > 0 && (
        <group position={[-1.65, 1.05, 1.96]}>
          <mesh>
            <boxGeometry args={[0.6, 0.28, 0.05]} /><meshLambertMaterial color="#fef9c3" />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ─── Plant model archetypes ────────────────────────────────────────────────────
function Stem({ h=0.6, r=0.04, color='#22c55e' }) {
  return (
    <mesh position={[0,h/2,0]} castShadow>
      <cylinderGeometry args={[r,r+0.02,h,6]}/><meshLambertMaterial color={color}/>
    </mesh>
  )
}
function Leaf({ stemH, color }) {
  return (
    <mesh position={[0.17,stemH*0.5,0]} rotation={[0,0,0.8]} castShadow>
      <boxGeometry args={[0.26,0.08,0.12]}/><meshLambertMaterial color={color}/>
    </mesh>
  )
}

function ModelDaisy({ c }) {
  const n = 6
  return (
    <group>
      <Stem h={0.55} color={c.stem}/><Leaf stemH={0.55} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.17,0.68,Math.cos(a)*0.17]} castShadow>
          <sphereGeometry args={[0.11,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.68,0]} castShadow><sphereGeometry args={[0.11,7,7]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelTulip({ c }) {
  return (
    <group>
      <Stem h={0.7} color={c.stem}/>
      <mesh position={[-0.18,0.5,0]} rotation={[0,0,-0.4]} castShadow>
        <boxGeometry args={[0.3,0.08,0.1]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {[0,1,2,3,4].map((_,i)=>{
        const a=i/5*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.11,0.82,Math.cos(a)*0.11]}
          rotation={[Math.cos(a)*0.5,0,Math.sin(a)*0.5]} castShadow>
          <sphereGeometry args={[0.14,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.78,0]}><sphereGeometry args={[0.09,7,7]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelRose({ c }) {
  return (
    <group>
      <Stem h={0.65} color={c.stem}/>
      <mesh position={[0.18,0.35,0]} rotation={[0,0,-0.6]} castShadow>
        <boxGeometry args={[0.22,0.06,0.08]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {/* Thorn */}
      <mesh position={[0.04,0.25,0]} rotation={[0,0,-0.9]}>
        <coneGeometry args={[0.025,0.08,4]}/><meshLambertMaterial color="#78350f"/>
      </mesh>
      {/* Outer petals */}
      {[0,1,2,3,4].map((_,i)=>{
        const a=i/5*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.22,0.75,Math.cos(a)*0.22]}
          rotation={[Math.cos(a)*0.7,0,Math.sin(a)*0.7]} castShadow>
          <sphereGeometry args={[0.14,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      {/* Inner petals */}
      {[0,1,2].map((_,i)=>{
        const a=i/3*Math.PI*2+0.5
        return <mesh key={i} position={[Math.sin(a)*0.11,0.82,Math.cos(a)*0.11]} castShadow>
          <sphereGeometry args={[0.1,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.88,0]}><sphereGeometry args={[0.07,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelSunflower({ c }) {
  const n=12
  return (
    <group>
      <Stem h={0.85} r={0.05} color={c.stem}/>
      <mesh position={[-0.2,0.5,0]} rotation={[0,0,-0.35]} castShadow>
        <boxGeometry args={[0.3,0.09,0.12]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.28,1.02,Math.cos(a)*0.28]} castShadow>
          <sphereGeometry args={[0.13,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,1.02,0]} castShadow><cylinderGeometry args={[0.18,0.18,0.06,12]}/><meshLambertMaterial color={c.center}/></mesh>
      {/* Seeds pattern */}
      {[0,1,2].map((_,i)=>{
        const a=i/3*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.08,1.06,Math.cos(a)*0.08]}>
          <sphereGeometry args={[0.03,4,4]}/><meshLambertMaterial color="#451a03"/>
        </mesh>
      })}
    </group>
  )
}

function ModelSpike({ c }) {
  return (
    <group>
      <Stem h={0.75} color={c.stem}/>
      <mesh position={[-0.15,0.45,0]} rotation={[0,0,-0.5]} castShadow>
        <boxGeometry args={[0.24,0.07,0.1]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {[0,1,2,3,4,5,6,7].map((_,i)=>{
        const h=0.6+i*0.07
        const r=i%2===0?0.06:0.03
        const angle=i*0.7
        return <mesh key={i} position={[Math.sin(angle)*r,h,Math.cos(angle)*r]} castShadow>
          <sphereGeometry args={[0.06,5,5]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
    </group>
  )
}

function ModelBall({ c }) {
  const n=16
  return (
    <group>
      <Stem h={0.6} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const phi=Math.acos(-1+2*i/n)
        const theta=Math.sqrt(n*Math.PI)*phi
        const r=0.28
        return <mesh key={i} position={[Math.sin(phi)*Math.cos(theta)*r,0.72+Math.cos(phi)*r*0.5,Math.sin(phi)*Math.sin(theta)*r]} castShadow>
          <sphereGeometry args={[0.09,5,5]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.72,0]}><sphereGeometry args={[0.18,7,7]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelBell({ c }) {
  const bells=[0,1,2,3]
  return (
    <group>
      <Stem h={0.7} color={c.stem}/>
      {bells.map((_,i)=>{
        const h=0.55+i*0.12
        const angle=i*1.1
        const r=0.09
        return (
          <group key={i} position={[Math.sin(angle)*r,h,Math.cos(angle)*r]} rotation={[Math.PI,0,0]}>
            <mesh castShadow><sphereGeometry args={[0.08,6,6,0,Math.PI*2,0,Math.PI*0.6]}/><meshLambertMaterial color={c.petal}/></mesh>
            <mesh position={[0,-0.04,0]}><sphereGeometry args={[0.03,4,4]}/><meshLambertMaterial color={c.center}/></mesh>
          </group>
        )
      })}
    </group>
  )
}

function ModelLotus({ c }) {
  const n=8
  return (
    <group>
      <Stem h={0.5} color={c.stem}/>
      {/* Pad */}
      <mesh position={[0,0.5,0]} rotation={[-Math.PI/2,0,0]}>
        <cylinderGeometry args={[0.3,0.3,0.03,10]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {/* Outer petals lying flat */}
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.26,0.53,Math.cos(a)*0.26]}
          rotation={[0.5,a,0]} castShadow>
          <sphereGeometry args={[0.13,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      {/* Inner petals */}
      {Array.from({length:5}).map((_,i)=>{
        const a=i/5*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.12,0.66,Math.cos(a)*0.12]}
          rotation={[0.3,a,0]} castShadow>
          <sphereGeometry args={[0.1,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.76,0]}><sphereGeometry args={[0.09,7,7]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelOrchid({ c }) {
  return (
    <group>
      <Stem h={0.6} color={c.stem}/>
      {/* Lip petal (large bottom) */}
      <mesh position={[0,0.72,-0.14]} rotation={[-0.4,0,0]} castShadow>
        <sphereGeometry args={[0.16,6,6]}/><meshLambertMaterial color={c.center}/>
      </mesh>
      {/* Side petals */}
      {[-1,1].map((s,i)=>(
        <mesh key={i} position={[s*0.22,0.76,0]} rotation={[0,0,s*0.6]} castShadow>
          <sphereGeometry args={[0.13,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      ))}
      {/* Upper petals */}
      {[-1,0,1].map((s,i)=>(
        <mesh key={i} position={[s*0.14,0.88,0.04]} rotation={[-0.3,0,s*0.5]} castShadow>
          <sphereGeometry args={[0.1,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      ))}
      <mesh position={[0,0.76,0]}><sphereGeometry args={[0.06,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelPoppy({ c }) {
  const n=4
  return (
    <group>
      <Stem h={0.65} r={0.035} color={c.stem}/>
      {/* Bud at top of stem before wide petals */}
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.19,0.73,Math.cos(a)*0.19]}
          rotation={[Math.cos(a)*0.6,0,Math.sin(a)*0.6]} castShadow>
          <sphereGeometry args={[0.15,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.73,0]}><sphereGeometry args={[0.09,7,7]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelHibiscus({ c }) {
  const n=5
  return (
    <group>
      <Stem h={0.6} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.23,0.7,Math.cos(a)*0.23]}
          rotation={[Math.cos(a)*0.7,0,Math.sin(a)*0.7]} castShadow>
          <sphereGeometry args={[0.16,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      {/* Long stamen */}
      <mesh position={[0,0.7,0]} castShadow><cylinderGeometry args={[0.025,0.025,0.32,6]}/><meshLambertMaterial color={c.center}/></mesh>
      <mesh position={[0,0.87,0]}><sphereGeometry args={[0.06,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelCalla({ c }) {
  return (
    <group>
      <Stem h={0.7} color={c.stem}/>
      {/* Spathe (funnel shape) */}
      <mesh position={[0,0.78,0]} rotation={[0.3,0,0]} castShadow>
        <coneGeometry args={[0.18,0.4,8,1,true]}/><meshLambertMaterial color={c.petal} side={2}/>
      </mesh>
      {/* Spadix */}
      <mesh position={[0,0.82,0.08]} rotation={[-0.5,0,0]} castShadow>
        <cylinderGeometry args={[0.03,0.03,0.3,6]}/><meshLambertMaterial color={c.center}/>
      </mesh>
    </group>
  )
}

function ModelStar({ c }) {
  const n=6
  return (
    <group>
      <Stem h={0.6} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return (
          <group key={i}>
            <mesh position={[Math.sin(a)*0.24,0.72,Math.cos(a)*0.24]} castShadow>
              <boxGeometry args={[0.08,0.18,0.04]}/><meshLambertMaterial color={c.petal}/>
            </mesh>
          </group>
        )
      })}
      <mesh position={[0,0.72,0]} castShadow>
        <octahedronGeometry args={[0.1]}/><meshLambertMaterial color={c.center} emissive={c.center} emissiveIntensity={0.4}/>
      </mesh>
    </group>
  )
}

function ModelCrystal({ c }) {
  return (
    <group>
      <Stem h={0.45} color={c.stem}/>
      {[0,1,2].map((_,i)=>{
        const a=i/3*Math.PI*2
        const h=0.55+i*0.15
        return (
          <mesh key={i} position={[Math.sin(a)*0.1,h,Math.cos(a)*0.1]} castShadow>
            <octahedronGeometry args={[0.14+i*0.03]}/>
            <meshLambertMaterial color={i===0?c.center:c.petal} transparent opacity={0.85} emissive={c.petal} emissiveIntensity={0.3}/>
          </mesh>
        )
      })}
    </group>
  )
}

function ModelCactus({ c }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0,0.42,0]} castShadow>
        <cylinderGeometry args={[0.15,0.17,0.84,8]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {/* Arms */}
      <mesh position={[-0.2,0.5,0]} rotation={[0,0,-Math.PI/2.5]} castShadow>
        <cylinderGeometry args={[0.08,0.1,0.35,8]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      <mesh position={[0.2,0.38,0]} rotation={[0,0,Math.PI/2.5]} castShadow>
        <cylinderGeometry args={[0.08,0.1,0.3,8]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      {/* Spines */}
      {[0,1,2,3,4,5].map((_,i)=>{
        const a=i/6*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.16,0.4+i*0.08,Math.cos(a)*0.16]}
          rotation={[Math.cos(a)*0.4,0,Math.sin(a)*0.4]}>
          <cylinderGeometry args={[0.006,0.002,0.1,3]}/><meshLambertMaterial color="#fef9c3"/>
        </mesh>
      })}
      {/* Flower on top */}
      <mesh position={[0,0.88,0]} castShadow><sphereGeometry args={[0.1,6,6]}/><meshLambertMaterial color={c.petal}/></mesh>
    </group>
  )
}

function ModelMushroom({ c }) {
  return (
    <group>
      <mesh position={[0,0.3,0]} castShadow>
        <cylinderGeometry args={[0.13,0.17,0.6,8]}/><meshLambertMaterial color={c.stem}/>
      </mesh>
      <mesh position={[0,0.72,0]} castShadow>
        <sphereGeometry args={[0.4,9,9,0,Math.PI*2,0,Math.PI*0.55]}/><meshLambertMaterial color={c.petal}/>
      </mesh>
      {[0,1,2].map(i=>(
        <mesh key={i} position={[Math.sin(i*2.1)*0.22,0.78,Math.cos(i*2.1)*0.22]}>
          <sphereGeometry args={[0.07,6,6]}/><meshLambertMaterial color="white"/>
        </mesh>
      ))}
    </group>
  )
}

function ModelClover({ c }) {
  return (
    <group>
      <Stem h={0.5} color={c.stem}/>
      {[0,1,2].map((_,i)=>{
        const a=i/3*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.15,0.58,Math.cos(a)*0.15]} castShadow>
          <sphereGeometry args={[0.12,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.72,0]} castShadow><sphereGeometry args={[0.08,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelDandelion({ c }) {
  const n=14
  return (
    <group>
      <Stem h={0.65} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const phi=Math.acos(-1+2*i/n)
        const theta=Math.sqrt(n*Math.PI)*phi
        return <mesh key={i} position={[Math.sin(phi)*Math.cos(theta)*0.22,0.72+Math.cos(phi)*0.1,Math.sin(phi)*Math.sin(theta)*0.22]}>
          <sphereGeometry args={[0.04,4,4]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      <mesh position={[0,0.72,0]}><sphereGeometry args={[0.06,5,5]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelPansy({ c }) {
  return (
    <group>
      <Stem h={0.48} color={c.stem}/>
      {/* Two upper petals */}
      {[-1,1].map((s,i)=>(
        <mesh key={i} position={[s*0.14,0.62,0.04]} rotation={[-0.2,0,s*0.5]} castShadow>
          <sphereGeometry args={[0.13,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      ))}
      {/* Three lower petals */}
      {[-1,0,1].map((s,i)=>(
        <mesh key={i} position={[s*0.14,0.54,-0.07]} rotation={[0.4,0,s*0.3]} castShadow>
          <sphereGeometry args={[0.12,6,6]}/><meshLambertMaterial color={c.center}/>
        </mesh>
      ))}
      <mesh position={[0,0.6,0]}><sphereGeometry args={[0.05,5,5]}/><meshLambertMaterial color="#fbbf24"/></mesh>
    </group>
  )
}

function ModelCarnation({ c }) {
  const rows=[{n:8,r:0.2,y:0.7},{n:6,r:0.13,y:0.78},{n:4,r:0.06,y:0.84}]
  return (
    <group>
      <Stem h={0.65} color={c.stem}/>
      {rows.flatMap((row,ri)=>
        Array.from({length:row.n}).map((_,i)=>{
          const a=i/row.n*Math.PI*2+(ri*0.4)
          return <mesh key={`${ri}-${i}`} position={[Math.sin(a)*row.r,row.y,Math.cos(a)*row.r]} castShadow>
            <sphereGeometry args={[0.08,5,5]}/><meshLambertMaterial color={c.petal}/>
          </mesh>
        })
      )}
    </group>
  )
}

function ModelIris({ c }) {
  return (
    <group>
      <Stem h={0.72} color={c.stem}/>
      {/* Falls (drooping lower petals) */}
      {[-1,0,1].map((s,i)=>(
        <mesh key={i} position={[s*0.16,0.72,-0.08]} rotation={[0.6,0,s*0.5]} castShadow>
          <sphereGeometry args={[0.14,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      ))}
      {/* Standards (upright upper petals) */}
      {[-1,0,1].map((s,i)=>(
        <mesh key={i} position={[s*0.12,0.88,0.06]} rotation={[-0.5,0,s*0.4]} castShadow>
          <sphereGeometry args={[0.12,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      ))}
      <mesh position={[0,0.76,0]}><sphereGeometry args={[0.06,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelDahlia({ c }) {
  const rings=[{n:12,r:0.28,y:0.7,s:0.1},{n:8,r:0.18,y:0.76,s:0.1},{n:6,r:0.09,y:0.82,s:0.09}]
  return (
    <group>
      <Stem h={0.65} color={c.stem}/>
      {rings.flatMap((ring,ri)=>
        Array.from({length:ring.n}).map((_,i)=>{
          const a=i/ring.n*Math.PI*2+(ri*0.3)
          return <mesh key={`${ri}-${i}`} position={[Math.sin(a)*ring.r,ring.y,Math.cos(a)*ring.r]}
            rotation={[Math.cos(a)*0.5,0,Math.sin(a)*0.5]} castShadow>
            <sphereGeometry args={[ring.s,5,5]}/><meshLambertMaterial color={c.petal}/>
          </mesh>
        })
      )}
      <mesh position={[0,0.86,0]}><sphereGeometry args={[0.06,6,6]}/><meshLambertMaterial color={c.center}/></mesh>
    </group>
  )
}

function ModelLily({ c }) {
  const n=6
  return (
    <group>
      <Stem h={0.7} color={c.stem}/>
      {Array.from({length:n}).map((_,i)=>{
        const a=i/n*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.18,0.72,Math.cos(a)*0.18]}
          rotation={[Math.cos(a)*0.5+0.3,0,Math.sin(a)*0.5]} castShadow>
          <sphereGeometry args={[0.13,6,6]}/><meshLambertMaterial color={c.petal}/>
        </mesh>
      })}
      {/* Stamens */}
      {[0,1,2].map((_,i)=>{
        const a=i/3*Math.PI*2
        return <mesh key={i} position={[Math.sin(a)*0.06,0.82,Math.cos(a)*0.06]} castShadow>
          <cylinderGeometry args={[0.015,0.015,0.18,4]}/><meshLambertMaterial color={c.center}/>
        </mesh>
      })}
    </group>
  )
}

const MODEL_RENDERERS = {
  daisy:    ModelDaisy,
  tulip:    ModelTulip,
  rose:     ModelRose,
  sunflower:ModelSunflower,
  spike:    ModelSpike,
  ball:     ModelBall,
  bell:     ModelBell,
  lotus:    ModelLotus,
  orchid:   ModelOrchid,
  poppy:    ModelPoppy,
  hibiscus: ModelHibiscus,
  calla:    ModelCalla,
  star:     ModelStar,
  crystal:  ModelCrystal,
  cactus:   ModelCactus,
  mushroom: ModelMushroom,
  clover:   ModelClover,
  dandelion:ModelDandelion,
  pansy:    ModelPansy,
  carnation:ModelCarnation,
  iris:     ModelIris,
  dahlia:   ModelDahlia,
  lily:     ModelLily,
}

function PlantModel({ seedId, progress, isReady, onClick }) {
  const groupRef = useRef()
  const cfg   = getPlantVisual(seedId)
  const scale = 0.15 + progress * 0.85
  const Renderer = MODEL_RENDERERS[cfg.model] || ModelDaisy

  useFrame(({ clock }) => {
    if (groupRef.current && isReady)
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.04
  })

  return (
    <group ref={groupRef} scale={scale} position={[0, 0.06, 0]} onClick={onClick}>
      <Renderer c={cfg}/>
    </group>
  )
}

function ReadySparkle() {
  const ref = useRef()
  useFrame(({clock})=>{
    if(ref.current){
      ref.current.rotation.y = clock.elapsedTime*2.8
      ref.current.position.y = 1.1+Math.sin(clock.elapsedTime*3.5)*.08
    }
  })
  return (
    <mesh ref={ref} position={[0,1.1,0]}>
      <octahedronGeometry args={[.14]}/>
      <meshLambertMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={.9}/>
    </mesh>
  )
}

function ProgressBar3D({ progress }) {
  if (progress<=.01||progress>=1) return null
  return (
    <group position={[0,.13,.78]}>
      <mesh><boxGeometry args={[1,.07,.04]}/><meshLambertMaterial color="#374151"/></mesh>
      <mesh position={[-(1-progress)*.5,0,.02]} scale={[progress,1,1]}>
        <boxGeometry args={[1,.07,.04]}/><meshLambertMaterial color="#4ade80"/>
      </mesh>
    </group>
  )
}

function GardenPlot({ index, plot, onPlotClick, totalCols }) {
  const col = index % totalCols
  const row = Math.floor(index / totalCols)
  const x   = (col - 2) * PLOT_SPACING
  const z   = (row - 2) * PLOT_SPACING   // fixed 5 rows centred around row=2

  const [progress, setProgress] = useState(()=>{
    if(!plot) return 0
    if(plot.state==='ready') return 1
    const elapsed=(plot.elapsed||0)+(Date.now()-(plot.savedAt||Date.now()))
    return Math.min(elapsed/plot.totalGrowTime,1)
  })

  useEffect(()=>{
    if(!plot){setProgress(0);return}
    if(plot.state==='ready'){setProgress(1);return}
    const start=Date.now()
    const base=plot.elapsed||0
    const id=setInterval(()=>{
      const p=Math.min((base+(Date.now()-start))/plot.totalGrowTime,1)
      setProgress(p)
    },150)
    return()=>clearInterval(id)
  },[plot])

  const isReady=!!(plot&&(plot.state==='ready'||progress>=1))
  const soilColor=!plot?'#92400e':isReady?'#4ade80':'#7c5b35'
  const handleClick=e=>{e.stopPropagation();onPlotClick(index)}

  return (
    <group position={[x,0,z]}>
      <mesh position={[0,-.02,0]} receiveShadow>
        <boxGeometry args={[1.62,.07,1.62]}/><meshLambertMaterial color="#44403c"/>
      </mesh>
      <mesh position={[0,.03,0]} receiveShadow onClick={handleClick}>
        <boxGeometry args={[1.5,.1,1.5]}/><meshLambertMaterial color={soilColor}/>
      </mesh>
      {plot&&<PlantModel seedId={plot.seedId} progress={progress} isReady={isReady} onClick={handleClick}/>}
      {isReady&&<ReadySparkle/>}
      {plot&&!isReady&&<ProgressBar3D progress={progress}/>}
    </group>
  )
}

// ─── Tool mesh (task 5) ───────────────────────────────────────────────────────
function ToolMesh({ toolId }) {
  switch(toolId) {
    case 'watering_can':
      return (
        <group>
          <mesh position={[.1,-.36,0]} castShadow>
            <boxGeometry args={[.28,.22,.18]}/><meshLambertMaterial color="#4ade80"/>
          </mesh>
          <mesh position={[.32,-.28,0]} rotation={[0,0,-.5]} castShadow>
            <cylinderGeometry args={[.03,.05,.34,8]}/><meshLambertMaterial color="#22c55e"/>
          </mesh>
          <mesh position={[0,-.22,0]} rotation={[0,0,.8]} castShadow>
            <boxGeometry args={[.04,.3,.04]}/><meshLambertMaterial color="#15803d"/>
          </mesh>
        </group>
      )
    case 'pitchfork':
      return (
        <group>
          <mesh position={[.15,-.32,-.1]} rotation={[.3,0,.38]} castShadow>
            <cylinderGeometry args={[.03,.03,1.1,8]}/><meshLambertMaterial color="#92400e"/>
          </mesh>
          {[-.07,0,.07].map((off,i)=>(
            <mesh key={i} position={[.4+off*.3,-.85+off*.1,-.22+off*.3]} rotation={[.3,0,.38]} castShadow>
              <cylinderGeometry args={[.02,.01,.28,6]}/><meshLambertMaterial color="#94a3b8"/>
            </mesh>
          ))}
          <mesh position={[.38,-.72,-.19]} rotation={[.3,.1,.38]} castShadow>
            <boxGeometry args={[.04,.04,.3]}/><meshLambertMaterial color="#94a3b8"/>
          </mesh>
        </group>
      )
    case 'hoe':
      return (
        <group>
          <mesh position={[.15,-.32,-.1]} rotation={[.3,0,.38]} castShadow>
            <cylinderGeometry args={[.03,.03,1.1,8]}/><meshLambertMaterial color="#92400e"/>
          </mesh>
          <mesh position={[.42,-.85,-.22]} rotation={[Math.PI/2+.3,.1,.38]} castShadow>
            <boxGeometry args={[.34,.08,.04]}/><meshLambertMaterial color="#94a3b8"/>
          </mesh>
        </group>
      )
    case 'golden_shovel':
      return (
        <group>
          <mesh position={[.15,-.32,-.1]} rotation={[.3,0,.38]} castShadow>
            <cylinderGeometry args={[.03,.03,1.15,8]}/><meshLambertMaterial color="#d97706"/>
          </mesh>
          <mesh position={[.42,-.83,-.21]} rotation={[.3,0,.38]} castShadow>
            <boxGeometry args={[.24,.22,.04]}/><meshLambertMaterial color="#fbbf24"/>
          </mesh>
          <mesh position={[.42,-.83,-.19]} rotation={[.3,0,.38]}>
            <boxGeometry args={[.20,.18,.01]}/><meshLambertMaterial color="#fde68a"/>
          </mesh>
        </group>
      )
    case 'magic_wand':
      return (
        <group>
          <mesh position={[.14,-.3,-.05]} rotation={[.2,0,.3]} castShadow>
            <cylinderGeometry args={[.025,.02,1.0,8]}/><meshLambertMaterial color="#1e293b"/>
          </mesh>
          <mesh position={[.38,-.75,-.14]} castShadow>
            <octahedronGeometry args={[.11]}/>
            <meshLambertMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={.9}/>
          </mesh>
          <mesh position={[.17,-.29,-.07]} rotation={[.2,0,.3]}>
            <cylinderGeometry args={[.032,.032,.07,8]}/><meshLambertMaterial color="#7c3aed"/>
          </mesh>
        </group>
      )
    default: // shovel
      return (
        <group>
          <mesh position={[.15,-.32,-.1]} rotation={[.3,0,.38]} castShadow>
            <cylinderGeometry args={[.03,.03,1.15,8]}/><meshLambertMaterial color="#92400e"/>
          </mesh>
          <mesh position={[.42,-.83,-.21]} rotation={[.3,0,.38]} castShadow>
            <boxGeometry args={[.24,.22,.04]}/><meshLambertMaterial color="#94a3b8"/>
          </mesh>
          <mesh position={[.42,-.83,-.19]} rotation={[.3,0,.38]}>
            <boxGeometry args={[.20,.18,.01]}/><meshLambertMaterial color="#cbd5e1"/>
          </mesh>
        </group>
      )
  }
}

// ─── Player character ─────────────────────────────────────────────────────────
function PlayerCharacter({ playerRef, outfit, swingRef }) {
  const {
    shirtColor  = '#6ee7b7',
    pantsColor  = '#60a5fa',
    hatColor    = null,
    hatBrim     = false,
    toolId      = 'shovel',
  } = outfit || {}

  const leftLegRef   = useRef()
  const rightLegRef  = useRef()
  const leftArmRef   = useRef()
  const rightArmRef  = useRef()
  const torsoGrpRef  = useRef()
  const movingRef = playerRef._movingRef || (playerRef._movingRef = { current: false })

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const moving = movingRef.current
    const swing  = moving ? Math.sin(t * 5) * 0.7 : 0

    if (leftLegRef.current)  leftLegRef.current.rotation.x  =  swing
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
    if (leftArmRef.current)  leftArmRef.current.rotation.x  = -swing * 0.55

    // Task 2: tool swing animation on plant/harvest
    if (swingRef && swingRef.current > 0) {
      swingRef.current = Math.max(0, swingRef.current - delta * 4)
      const swingAngle = Math.sin(swingRef.current * Math.PI) * -1.8
      if (rightArmRef.current) rightArmRef.current.rotation.x = swingAngle
    } else {
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.28 - 0.18
    }

    if (torsoGrpRef.current) {
      const bounce = moving
        ? Math.abs(Math.sin(t * 5)) * 0.07
        : Math.sin(t * 1.3) * 0.013
      torsoGrpRef.current.position.y = bounce
    }
  })

  return (
    <group ref={playerRef}>
      {/* ── Legs (outside bounce group so they stay grounded) ── */}
      {[[-0.155, leftLegRef], [0.155, rightLegRef]].map(([lx, ref], k) => (
        <group key={k} ref={ref} position={[lx, 0.5, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <boxGeometry args={[0.22, 0.52, 0.22]}/>
            <meshLambertMaterial color={pantsColor}/>
          </mesh>
          <mesh position={[0, -0.54, 0.04]} castShadow>
            <boxGeometry args={[0.24, 0.1, 0.28]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
        </group>
      ))}

      {/* ── Upper body (bounces on each step) ── */}
      <group ref={torsoGrpRef}>
        {/* Torso */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[0.56, 0.62, 0.3]}/>
          <meshLambertMaterial color={shirtColor}/>
        </mesh>
        {/* Overalls bib */}
        <mesh position={[0, 0.96, 0.16]}>
          <boxGeometry args={[0.34, 0.42, 0.02]}/>
          <meshLambertMaterial color={shirtColor} opacity={0.7} transparent/>
        </mesh>
        {/* Pocket detail */}
        <mesh position={[0, 0.82, 0.165]}>
          <boxGeometry args={[0.14, 0.12, 0.01]}/>
          <meshLambertMaterial color="#d1fae5"/>
        </mesh>

        {/* Left arm */}
        <group ref={leftArmRef} position={[-0.39, 0.92, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.46, 0.2]}/>
            <meshLambertMaterial color="#fde68a"/>
          </mesh>
        </group>

        {/* Right arm + tool */}
        <group ref={rightArmRef} position={[0.39, 0.92, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.46, 0.2]}/>
            <meshLambertMaterial color="#fde68a"/>
          </mesh>
          <ToolMesh toolId={toolId}/>
        </group>

        {/* Head */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.4]}/>
          <meshLambertMaterial color="#fde68a"/>
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.11, 1.44, 0.21]}>
          <boxGeometry args={[0.09, 0.09, 0.01]}/><meshLambertMaterial color="#1e293b"/>
        </mesh>
        <mesh position={[0.11, 1.44, 0.21]}>
          <boxGeometry args={[0.09, 0.09, 0.01]}/><meshLambertMaterial color="#1e293b"/>
        </mesh>
        <mesh position={[0, 1.34, 0.21]}>
          <boxGeometry args={[0.13, 0.04, 0.01]}/><meshLambertMaterial color="#1e293b"/>
        </mesh>
        {/* Cheeks */}
        <mesh position={[-0.16, 1.36, 0.21]}>
          <boxGeometry args={[0.06, 0.05, 0.01]}/><meshLambertMaterial color="#fca5a5"/>
        </mesh>
        <mesh position={[0.16, 1.36, 0.21]}>
          <boxGeometry args={[0.06, 0.05, 0.01]}/><meshLambertMaterial color="#fca5a5"/>
        </mesh>

        {/* Hat (only shown when hatColor is set) */}
        {hatColor && <>
          {hatBrim && (
            <mesh position={[0, 1.65, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.36, 0.06, 12]}/>
              <meshLambertMaterial color={hatColor}/>
            </mesh>
          )}
          <mesh position={[0, hatBrim ? 1.95 : 1.72, 0]} castShadow>
            <cylinderGeometry args={[0.23, 0.25, 0.58, 10]}/>
            <meshLambertMaterial color={hatColor}/>
          </mesh>
          <mesh position={[0, hatBrim ? 1.66 : 1.43, 0]}>
            <cylinderGeometry args={[0.252, 0.252, 0.09, 10]}/>
            <meshLambertMaterial color="#fbbf24"/>
          </mesh>
        </>}
      </group>
    </group>
  )
}

// ─── Wilderness (north, z < WILD_BOUNDARY) ───────────────────────────────────
const TREE_POSITIONS = [
  [-8,-18],[-3,-20],[5,-19],[9,-17],[-6,-23],[0,-25],[7,-24],
  [-9,-27],[3,-28],[-4,-30],[8,-21],[2,-16],[-7,-15],[-1,-22],[6,-26],
]
const TREE_MAX_HP = 5   // hits to chop down a tree

function PineTree({ x, z, hp }) {
  const pct = hp / TREE_MAX_HP
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.1, 6]}/>
        <meshLambertMaterial color="#78350f"/>
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 1.1 + i * 0.65, 0]} castShadow>
          <coneGeometry args={[(0.85 - i * 0.2) * pct, 1.0 * pct, 7]}/>
          <meshLambertMaterial color={i % 2 === 0 ? '#14532d' : '#166534'}/>
        </mesh>
      ))}
      {/* HP pip row */}
      {Array.from({length: TREE_MAX_HP}).map((_, i) => (
        <mesh key={`hp${i}`} position={[(i - (TREE_MAX_HP-1)/2) * 0.18, 3.0, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.04]}/>
          <meshLambertMaterial color={i < hp ? '#22c55e' : '#374151'}/>
        </mesh>
      ))}
    </group>
  )
}

function Stump({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 6]}/>
        <meshLambertMaterial color="#78350f"/>
      </mesh>
    </group>
  )
}

function Wilderness({ treeHps, choppedTrees }) {
  return (
    <group>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.06, -24]} receiveShadow>
        <planeGeometry args={[42, 24]}/>
        <meshLambertMaterial color="#1a2e1a"/>
      </mesh>
      {/* Boundary warning strip */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, WILD_BOUNDARY + 0.5]} receiveShadow>
        <planeGeometry args={[42, 1]}/>
        <meshLambertMaterial color="#422006"/>
      </mesh>
      {/* Wilderness boundary fence */}
      {Array.from({length: 10}).map((_, i) => {
        const x = (i - 4.5) * 3
        return (
          <group key={`fence${i}`} position={[x, 0, WILD_BOUNDARY]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 1.0, 0.1]}/><meshLambertMaterial color="#8b5a3c"/>
            </mesh>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[2.8, 0.08, 0.08]}/><meshLambertMaterial color="#8b5a3c"/>
            </mesh>
            <mesh position={[0, 0.65, 0]} castShadow>
              <boxGeometry args={[2.8, 0.08, 0.08]}/><meshLambertMaterial color="#a0724d"/>
            </mesh>
          </group>
        )
      })}
      {TREE_POSITIONS.map(([x, z], id) =>
        choppedTrees.has(id)
          ? <Stump key={id} x={x} z={z} />
          : <PineTree key={id} x={x} z={z} hp={treeHps[id] ?? TREE_MAX_HP} />
      )}
    </group>
  )
}

// ─── Castle City (south, z > CASTLE_ENTRY_Z) ─────────────────────────────────
function NpcCharacter({ npc }) {
  return (
    <group position={[npc.x, 0, npc.z]}>
      {/* Legs */}
      {[-0.12, 0.12].map((lx, i) => (
        <mesh key={i} position={[lx, 0.28, 0]} castShadow>
          <boxGeometry args={[0.18, 0.56, 0.18]}/>
          <meshLambertMaterial color="#1e40af"/>
        </mesh>
      ))}
      {/* Body */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.48, 0.52, 0.26]}/>
        <meshLambertMaterial color={npc.color}/>
      </mesh>
      {/* Arms */}
      {[-0.35, 0.35].map((ax, i) => (
        <mesh key={i} position={[ax, 0.82, 0]} castShadow>
          <boxGeometry args={[0.16, 0.44, 0.18]}/>
          <meshLambertMaterial color="#fde68a"/>
        </mesh>
      ))}
      {/* Head */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.38, 0.38, 0.34]}/>
        <meshLambertMaterial color="#fde68a"/>
      </mesh>
      {/* Eyes */}
      {[-0.09, 0.09].map((ex, i) => (
        <mesh key={i} position={[ex, 1.3, 0.18]}>
          <boxGeometry args={[0.07, 0.07, 0.01]}/>
          <meshLambertMaterial color="#1e293b"/>
        </mesh>
      ))}
      {/* Name board */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[0.85, 0.22, 0.04]}/>
        <meshLambertMaterial color="#fef3c7"/>
      </mesh>
    </group>
  )
}

function ShopBuilding({ x, z, color }) {
  // Derive a slightly darker shade for trim/accents
  const trimColor = '#c0bdb9'
  const wallColor = '#f5f0eb'
  const stoneColor = '#a8a29e'
  return (
    <group position={[x, 0, z]}>
      {/* Stone foundation */}
      <mesh position={[0, 0.14, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.0, 0.28, 3.6]}/>
        <meshLambertMaterial color={stoneColor}/>
      </mesh>
      {/* Main walls */}
      <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 2.0, 3.2]}/>
        <meshLambertMaterial color={wallColor}/>
      </mesh>
      {/* Corner pilasters — left & right */}
      {[-1.82, 1.82].map((px, i) => (
        <mesh key={i} position={[px, 1.28, 0]} castShadow>
          <boxGeometry args={[0.22, 2.08, 3.28]}/>
          <meshLambertMaterial color={trimColor}/>
        </mesh>
      ))}
      {/* Horizontal belt course above door */}
      <mesh position={[0, 2.34, 1.62]} castShadow>
        <boxGeometry args={[3.64, 0.14, 0.1]}/>
        <meshLambertMaterial color={trimColor}/>
      </mesh>

      {/* === GABLED ROOF === */}
      {/* Flat eave overhang */}
      <mesh position={[0, 2.30, 0]} castShadow>
        <boxGeometry args={[4.1, 0.12, 3.7]}/>
        <meshLambertMaterial color={color}/>
      </mesh>
      {/* Two sloping roof panels */}
      <mesh position={[0, 2.80, -0.88]} rotation={[-0.52, 0, 0]} castShadow>
        <boxGeometry args={[4.0, 0.12, 1.9]}/>
        <meshLambertMaterial color={color}/>
      </mesh>
      <mesh position={[0, 2.80, 0.88]} rotation={[0.52, 0, 0]} castShadow>
        <boxGeometry args={[4.0, 0.12, 1.9]}/>
        <meshLambertMaterial color={color}/>
      </mesh>
      {/* Ridge cap */}
      <mesh position={[0, 3.22, 0]} castShadow>
        <boxGeometry args={[4.05, 0.14, 0.22]}/>
        <meshLambertMaterial color={color}/>
      </mesh>
      {/* Gable end triangles */}
      {[-2.06, 2.06].map((gx, gi) => (
        <group key={gi} position={[gx, 2.28, 0]}>
          {[0, 0.22, 0.44, 0.66].map((dy, di) => (
            <mesh key={di} position={[0, dy + 0.12, 0]} castShadow>
              <boxGeometry args={[0.12, 0.24, 1.52 - di * 0.38]}/>
              <meshLambertMaterial color={wallColor}/>
            </mesh>
          ))}
        </group>
      ))}

      {/* === DOOR === */}
      {/* Door frame */}
      <mesh position={[0, 1.0, 1.62]} castShadow>
        <boxGeometry args={[0.96, 1.88, 0.1]}/>
        <meshLambertMaterial color="#92400e"/>
      </mesh>
      {/* Door panel */}
      <mesh position={[0, 0.96, 1.64]} castShadow>
        <boxGeometry args={[0.76, 1.72, 0.09]}/>
        <meshLambertMaterial color="#78350f"/>
      </mesh>
      {/* Door panel rail (horizontal divider) */}
      <mesh position={[0, 0.84, 1.65]}>
        <boxGeometry args={[0.72, 0.06, 0.06]}/>
        <meshLambertMaterial color="#92400e"/>
      </mesh>
      {/* Door knob */}
      <mesh position={[0.28, 0.96, 1.68]}>
        <sphereGeometry args={[0.055, 6, 6]}/>
        <meshLambertMaterial color="#d97706"/>
      </mesh>

      {/* === WINDOWS (front) === */}
      {[-1.12, 1.12].map((wx, i) => (
        <group key={i} position={[wx, 1.28, 1.62]}>
          {/* Window frame */}
          <mesh castShadow>
            <boxGeometry args={[0.72, 0.78, 0.1]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
          {/* Glass pane */}
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.58, 0.64, 0.06]}/>
            <meshLambertMaterial color="#bae6fd" transparent opacity={0.75}/>
          </mesh>
          {/* Window cross dividers */}
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.58, 0.04, 0.04]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.04, 0.64, 0.04]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
          {/* Flower box below window */}
          <mesh position={[0, -0.46, 0.06]} castShadow>
            <boxGeometry args={[0.7, 0.16, 0.22]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
          {/* Flowers in box */}
          {[-0.18, 0, 0.18].map((fx, fi) => (
            <mesh key={fi} position={[fx, -0.32, 0.08]}>
              <sphereGeometry args={[0.08, 5, 5]}/>
              <meshLambertMaterial color={fi === 1 ? '#fbbf24' : '#f472b6'}/>
            </mesh>
          ))}
        </group>
      ))}

      {/* === SIDE WINDOWS === */}
      {[-1, 1].map((side, si) => (
        <group key={si} position={[side * 1.82, 1.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.72, 0.68]}/>
            <meshLambertMaterial color="#92400e"/>
          </mesh>
          <mesh position={[side * 0.01, 0, 0]}>
            <boxGeometry args={[0.06, 0.58, 0.54]}/>
            <meshLambertMaterial color="#bae6fd" transparent opacity={0.75}/>
          </mesh>
        </group>
      ))}

      {/* === HANGING SIGN === */}
      {/* Sign bracket arms */}
      {[-0.44, 0.44].map((bx, bi) => (
        <mesh key={bi} position={[bx, 2.52, 1.66]}>
          <boxGeometry args={[0.06, 0.28, 0.06]}/>
          <meshLambertMaterial color="#92400e"/>
        </mesh>
      ))}
      {/* Sign board */}
      <mesh position={[0, 2.36, 1.66]} castShadow>
        <boxGeometry args={[1.08, 0.34, 0.1]}/>
        <meshLambertMaterial color="#fef3c7"/>
      </mesh>
      {/* Sign border */}
      <mesh position={[0, 2.36, 1.67]}>
        <boxGeometry args={[1.12, 0.38, 0.07]}/>
        <meshLambertMaterial color="#92400e"/>
      </mesh>
      <mesh position={[0, 2.36, 1.68]}>
        <boxGeometry args={[1.06, 0.32, 0.08]}/>
        <meshLambertMaterial color="#fef3c7"/>
      </mesh>

      {/* === SMALL FRONT STEP === */}
      <mesh position={[0, 0.08, 1.72]} castShadow>
        <boxGeometry args={[1.1, 0.16, 0.32]}/>
        <meshLambertMaterial color={stoneColor}/>
      </mesh>

      {/* === CHIMNEY === */}
      <mesh position={[1.1, 3.4, -0.6]} castShadow>
        <boxGeometry args={[0.36, 1.4, 0.36]}/>
        <meshLambertMaterial color={stoneColor}/>
      </mesh>
      {/* Chimney cap */}
      <mesh position={[1.1, 4.12, -0.6]} castShadow>
        <boxGeometry args={[0.48, 0.1, 0.48]}/>
        <meshLambertMaterial color="#78716c"/>
      </mesh>
    </group>
  )
}

const GATE_MAX_HP = 60

function CastleCity({ gateHp = GATE_MAX_HP }) {
  const wallColor = '#78716c'
  const wallH     = 2.2
  const wallW     = 0.6
  const gateAlive = gateHp > 0
  const gatePct   = gateHp / GATE_MAX_HP

  return (
    <group>
      {/* Castle ground */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, 21.5]} receiveShadow>
        <planeGeometry args={[24, 20]}/>
        <meshLambertMaterial color="#d6d3d1"/>
      </mesh>
      {/* Town path */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.02, 19]} receiveShadow>
        <planeGeometry args={[2.4, 12]}/>
        <meshLambertMaterial color="#a8a29e"/>
      </mesh>

      {/* Front wall — two halves flanking the gate gap */}
      <mesh position={[-7.25, wallH/2, 13]} castShadow>
        <boxGeometry args={[9.5, wallH, wallW]}/><meshLambertMaterial color={wallColor}/>
      </mesh>
      <mesh position={[7.25, wallH/2, 13]} castShadow>
        <boxGeometry args={[9.5, wallH, wallW]}/><meshLambertMaterial color={wallColor}/>
      </mesh>
      <mesh position={[0, wallH/2, 31.5]} castShadow>
        <boxGeometry args={[24, wallH, wallW]}/><meshLambertMaterial color={wallColor}/>
      </mesh>
      <mesh position={[-12, wallH/2, 22.25]} castShadow>
        <boxGeometry args={[wallW, wallH, 18.5]}/><meshLambertMaterial color={wallColor}/>
      </mesh>
      <mesh position={[12, wallH/2, 22.25]} castShadow>
        <boxGeometry args={[wallW, wallH, 18.5]}/><meshLambertMaterial color={wallColor}/>
      </mesh>

      {/* Battlements */}
      {[-4,-2,0,2,4].map(i => (
        <mesh key={i} position={[i*2.4, wallH + 0.22, 13]} castShadow>
          <boxGeometry args={[0.7, 0.44, 0.65]}/><meshLambertMaterial color="#57534e"/>
        </mesh>
      ))}

      {/* Corner towers */}
      {[[-12,13],[12,13],[-12,31.5],[12,31.5]].map(([tx,tz],i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, wallH * 0.65, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.3, wallH * 1.3, 8]}/>
            <meshLambertMaterial color={wallColor}/>
          </mesh>
          <mesh position={[0, wallH * 1.4, 0]} castShadow>
            <coneGeometry args={[1.15, 1.2, 8]}/>
            <meshLambertMaterial color="#7c2d12"/>
          </mesh>
        </group>
      ))}

      {/* Gate pillars (always present) */}
      {[-2.5, 2.5].map((gx, i) => (
        <mesh key={i} position={[gx, wallH * 0.65, 13]} castShadow>
          <boxGeometry args={[0.55, wallH * 1.3, wallW * 1.2]}/>
          <meshLambertMaterial color="#57534e"/>
        </mesh>
      ))}
      {/* Gate arch */}
      <mesh position={[0, wallH + 0.15, 13]}>
        <boxGeometry args={[5.6, 0.44, wallW * 1.2]}/><meshLambertMaterial color="#57534e"/>
      </mesh>

      {/* Gate doors (rendered only when gate alive) */}
      {gateAlive && (
        <group position={[0, 0, 13]}>
          {[-1.1, 1.1].map((dx, i) => (
            <mesh key={i} position={[dx, wallH * 0.5 * gatePct, 0]} castShadow>
              <boxGeometry args={[2.1, wallH * gatePct, 0.25]}/>
              <meshLambertMaterial color="#92400e" opacity={0.7 + 0.3 * gatePct} transparent/>
            </mesh>
          ))}
          {/* Gate HP bar */}
          <group position={[0, wallH + 0.6, 0]}>
            <mesh><boxGeometry args={[4, 0.18, 0.05]}/><meshLambertMaterial color="#1e293b"/></mesh>
            <mesh position={[-(1 - gatePct) * 2, 0, 0.04]} scale={[gatePct, 1, 1]}>
              <boxGeometry args={[4, 0.18, 0.05]}/><meshLambertMaterial color="#ef4444"/>
            </mesh>
          </group>
        </group>
      )}

      {/* 4 shop buildings offset behind their NPC */}
      {CASTLE_NPCS.map(npc => (
        <ShopBuilding key={npc.id} x={npc.x} z={npc.z + 3} color={npc.color}/>
      ))}

      {/* 4 NPC characters in front of shops */}
      {CASTLE_NPCS.map(npc => (
        <NpcCharacter key={npc.id} npc={npc}/>
      ))}
    </group>
  )
}

// ─── Zombie ───────────────────────────────────────────────────────────────────
function ZombieBody({ zombie, hp, meshMapRef, legMapRef, hpBarMapRef }) {
  const ref         = useRef()
  const leftLegRef  = useRef()
  const rightLegRef = useRef()
  const hpFillRef   = useRef()

  useEffect(() => {
    const id = zombie.id
    if (ref.current) {
      ref.current.position.set(zombie.x, 0, zombie.z)
      meshMapRef.current.set(id, ref.current)
    }
    if (leftLegRef.current && rightLegRef.current)
      legMapRef.current.set(id, { left: leftLegRef.current, right: rightLegRef.current })
    if (hpFillRef.current)
      hpBarMapRef.current.set(id, hpFillRef.current)
    return () => {
      meshMapRef.current.delete(id)
      legMapRef.current.delete(id)
      hpBarMapRef.current.delete(id)
    }
  }, [zombie.id, meshMapRef, legMapRef, hpBarMapRef])

  // No per-zombie useFrame — leg animation handled centrally in GameScene

  if (hp <= 0) return null

  return (
    <group ref={ref} position={[zombie.x, 0, zombie.z]}>
      {/* Legs */}
      <group ref={leftLegRef} position={[-0.12, 0.28, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.56, 0.18]}/>
          <meshLambertMaterial color="#166534"/>
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.12, 0.28, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.56, 0.18]}/>
          <meshLambertMaterial color="#166534"/>
        </mesh>
      </group>
      {/* Body */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.48, 0.52, 0.26]}/>
        <meshLambertMaterial color="#15803d"/>
      </mesh>
      {/* Arms outstretched */}
      {[-0.38, 0.38].map((ax, i) => (
        <mesh key={i} position={[ax, 1.08, 0.14]} rotation={[Math.PI * 0.38, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.42, 0.16]}/>
          <meshLambertMaterial color="#4ade80"/>
        </mesh>
      ))}
      {/* Head */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.38, 0.38, 0.34]}/>
        <meshLambertMaterial color="#4ade80"/>
      </mesh>
      {/* Red eyes */}
      {[-0.09, 0.09].map((ex, i) => (
        <mesh key={i} position={[ex, 1.3, 0.18]}>
          <boxGeometry args={[0.08, 0.06, 0.01]}/>
          <meshLambertMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8}/>
        </mesh>
      ))}
      {/* HP bar — fill mesh is updated via ref in GameScene's useFrame */}
      <group position={[0, 1.82, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.09, 0.04]}/><meshLambertMaterial color="#1e293b"/>
        </mesh>
        <mesh ref={hpFillRef} position={[0, 0, 0.03]}>
          <boxGeometry args={[0.7, 0.09, 0.04]}/><meshLambertMaterial color="#ef4444"/>
        </mesh>
      </group>
    </group>
  )
}

// ─── Arrow projectile ────────────────────────────────────────────────────────
// Position is updated directly via ref each frame — React state only drives add/remove
function ArrowProjectile({ id, initX, initY, initZ, initDx, initDz, meshMapRef }) {
  const ref   = useRef()
  const angle = Math.atan2(initDx, initDz)

  useEffect(() => {
    if (ref.current) meshMapRef.current.set(id, ref.current)
    return () => meshMapRef.current.delete(id)
  }, [id, meshMapRef])

  return (
    <group ref={ref} position={[initX, initY, initZ]} rotation={[0, angle, 0]}>
      {/* Shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.55, 4]}/>
        <meshLambertMaterial color="#92400e"/>
      </mesh>
      {/* Head */}
      <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 4]}/>
        <meshLambertMaterial color="#94a3b8"/>
      </mesh>
      {/* Fletching */}
      <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 4]}/>
        <meshLambertMaterial color="#f3f4f6"/>
      </mesh>
    </group>
  )
}

// ─── Watch Tower (archer upgrade) ────────────────────────────────────────────
function WatchTower({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {/* Stone base */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.35, 1.1, 8]}/>
        <meshLambertMaterial color="#57534e"/>
      </mesh>
      {/* Tower body */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.88, 1.05, 1.8, 8]}/>
        <meshLambertMaterial color="#78716c"/>
      </mesh>
      {/* Battlements */}
      {Array.from({length: 8}).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.82, 3.1, Math.cos(a) * 0.82]} castShadow>
            <boxGeometry args={[0.3, 0.44, 0.28]}/>
            <meshLambertMaterial color="#57534e"/>
          </mesh>
        )
      })}
      {/* Platform floor */}
      <mesh position={[0, 2.88, 0]}>
        <cylinderGeometry args={[0.96, 0.96, 0.08, 8]}/>
        <meshLambertMaterial color="#44403c"/>
      </mesh>
      {/* Archer body */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <boxGeometry args={[0.38, 0.44, 0.22]}/>
        <meshLambertMaterial color="#1d4ed8"/>
      </mesh>
      {/* Archer head */}
      <mesh position={[0, 3.64, 0]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.26]}/>
        <meshLambertMaterial color="#fde68a"/>
      </mesh>
      {/* Bow */}
      <mesh position={[0.28, 3.3, 0.1]} rotation={[0.2, 0, 0.3]} castShadow>
        <torusGeometry args={[0.18, 0.022, 6, 10, Math.PI]}/>
        <meshLambertMaterial color="#92400e"/>
      </mesh>
      {/* Bowstring */}
      <mesh position={[0.28, 3.28, 0.28]} rotation={[Math.PI / 2, 0, 0.3]}>
        <cylinderGeometry args={[0.008, 0.008, 0.36, 4]}/>
        <meshLambertMaterial color="#f9fafb"/>
      </mesh>
    </group>
  )
}

// Archer stats based on castle upgrades
function getArcherStats(castleUpgrades) {
  if (!castleUpgrades?.archers) return null
  if (castleUpgrades.archers_4) return { damage: 7, cooldown: 2.0 }
  if (castleUpgrades.archers_3) return { damage: 5, cooldown: 3.0 }
  if (castleUpgrades.archers_2) return { damage: 3, cooldown: 4.0 }
  return { damage: 2, cooldown: 5.0 }
}

const TOWER_POSITIONS = [[-8, 14.5], [8, 14.5]]

// ─── Camera + movement ────────────────────────────────────────────────────────
const _camTarget    = new THREE.Vector3()
const _lookAt       = new THREE.Vector3()
const MOVE_SPEED    = 4.5
const TURN_SPEED    = 2.4
const REACH         = 2.6   // max distance to interact with a plot (task 1)
const NIGHT_SECONDS = 120    // must match App.jsx

// House AABB in world space (task 6): house at [-11,0,0] rotated 90°
// Unrotated: 4 wide (x) × 3.4 deep (z) → after 90° rot: 3.4 wide (x) × 4 deep (z)
const HOUSE_AABB = { minX: -12.7, maxX: -9.3, minZ: -2.0, maxZ: 2.0 }
const PLAYER_R   = 0.4

function GameScene({ plots, onPlotClick, profile, outfit, onNearHouse, onHouseEnter,
                     dayPhase, onPlayerDamaged, onTalkToNpc, onNearNpc, onSleep,
                     attackDamage, weaponRange, equipSource, chopDamage, onTreeChopped, treeBaseReward }) {
  const playerRef    = useRef()
  const playerPos    = useRef(new THREE.Vector3(0, 0, 6))
  const playerRot    = useRef(Math.PI)
  const jumpVel      = useRef(0)
  const keys         = useRef({})
  const movingRef    = useRef(false)
  const nearRef      = useRef(false)
  const swingRef     = useRef(0)
  const ambientRef   = useRef()
  const totalCols    = 5 + (profile?.extraRows || 0)

  // Keep latest prop values accessible inside useFrame without stale closures
  const dayPhaseRef       = useRef(dayPhase)
  const attackDmgRef      = useRef(attackDamage)
  const weaponRangeRef    = useRef(weaponRange)
  const equipSourceRef    = useRef(equipSource)
  const castleUpgradesRef = useRef(profile?.castleUpgrades || {})
  useEffect(() => { dayPhaseRef.current = dayPhase },               [dayPhase])
  useEffect(() => { attackDmgRef.current = attackDamage },          [attackDamage])
  useEffect(() => { weaponRangeRef.current = weaponRange },         [weaponRange])
  useEffect(() => { equipSourceRef.current = equipSource },         [equipSource])
  useEffect(() => { castleUpgradesRef.current = profile?.castleUpgrades || {} }, [profile?.castleUpgrades])

  // Arrow projectile system — meshMapRef lets us update positions directly (no per-frame setState)
  const arrowsRef     = useRef([])
  const arrowMeshMap  = useRef(new Map())
  const [arrowRenders, setArrowRenders] = useState([])
  const nextArrowId   = useRef(0)
  const archerTimer   = useRef(0)

  // Zombie system — positions live in refs, only HP=0 triggers re-render
  const zombiesRef     = useRef([])
  const zombieMeshMap  = useRef(new Map())
  const zombieLegMap   = useRef(new Map())   // id → {left, right} group refs for leg animation
  const zombieHpBarMap = useRef(new Map())   // id → hp fill mesh ref
  const [zombieHps, setZombieHps] = useState({})
  const allZombiesDeadRef = useRef(false)
  const nextZombieIdRef = useRef(0)
  const spawnTimerRef   = useRef(0)
  const daySpawnRef     = useRef(5)

  // Track totalCols and dayCount inside useFrame without stale closure
  const totalColsRef  = useRef(totalCols)
  const dayCountRef   = useRef(profile?.dayCount || 1)
  useEffect(() => { totalColsRef.current = totalCols }, [totalCols])
  useEffect(() => { dayCountRef.current = profile?.dayCount || 1 }, [profile?.dayCount])

  // Gate state (repairs each morning)
  const [gateHp, setGateHp]     = useState(GATE_MAX_HP)
  const gateHpRef               = useRef(GATE_MAX_HP)
  const gateHitRef              = useRef(0)
  useEffect(() => {
    if (dayPhase === 'day') {
      gateHpRef.current = GATE_MAX_HP
      setGateHp(GATE_MAX_HP)
      // Trees re-grow every morning
      const freshHps = Object.fromEntries(TREE_POSITIONS.map((_, i) => [i, TREE_MAX_HP]))
      treeHpsRef.current = freshHps
      setTreeHps(freshHps)
      choppedRef.current = new Set()
      setChoppedTrees(new Set())
    }
  }, [dayPhase])

  // Tree chopping state
  const [treeHps, setTreeHps]       = useState(() => Object.fromEntries(TREE_POSITIONS.map((_, i) => [i, TREE_MAX_HP])))
  const [choppedTrees, setChoppedTrees] = useState(() => new Set())
  const treeHpsRef    = useRef(Object.fromEntries(TREE_POSITIONS.map((_, i) => [i, TREE_MAX_HP])))
  const choppedRef    = useRef(new Set())
  const chopCoolRef   = useRef(0)
  const chopDmgRef    = useRef(chopDamage || 0)
  useEffect(() => { chopDmgRef.current = chopDamage || 0 }, [chopDamage])

  // NPC proximity tracking
  const nearNpcRef = useRef(null)

  useEffect(() => {
    const down = e => { keys.current[e.code] = true }
    const up   = e => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    playerRef._movingRef = movingRef
  })

  // Farm bounds — used to exclude zombie spawns from farm area
  const FARM_MIN_Z = -3.8 - 1.0, FARM_MAX_Z = 3.8 + 1.0
  const FARM_MIN_X = -4.9,       FARM_MAX_X = 5.0
  const inFarm = (x, z) =>
    x > FARM_MIN_X && x < FARM_MAX_X && z > FARM_MIN_Z && z < FARM_MAX_Z

  // Day-start: ensure minimum daytime wanderers (keep survivors, top up if needed)
  useEffect(() => {
    if (dayPhase !== 'day') return
    const dayCount = profile?.dayCount || 1
    const minWanderers = Math.min(dayCount + 3, ALL_SPAWN_POS.length)
    const validSpawns  = ALL_SPAWN_POS.filter(([x, z]) => !inFarm(x, z))
    const alive = zombiesRef.current.filter(z => z.hp > 0).length

    if (alive < minWanderers) {
      const toSpawn = minWanderers - alive
      const shuffled = [...validSpawns].sort(() => Math.random() - 0.5)
      const added = []
      for (let i = 0; i < toSpawn && i < shuffled.length; i++) {
        const [sx, sz] = shuffled[i]
        const id = nextZombieIdRef.current++
        const z  = { id, x: sx, z: sz, hp: 10, lastHit: 0, _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0 }
        zombiesRef.current.push(z)
        added.push(z)
      }
      if (added.length > 0) {
        setZombieHps(prev => {
          const u = { ...prev }
          added.forEach(z => { u[z.id] = 10 })
          return u
        })
      }
    }
    daySpawnRef.current  = zombiesRef.current.filter(z => z.hp > 0).length
    spawnTimerRef.current = 0
    allZombiesDeadRef.current = false
  }, [dayPhase, profile?.dayCount])

  // Night-start: spawn ever-increasing horde on top of surviving wanderers
  useEffect(() => {
    if (dayPhase !== 'night') return
    const dayCount  = profile?.dayCount || 1
    const batchSize = dayCount * 3 + 5
    const validSpawns = ALL_SPAWN_POS.filter(([x, z]) => !inFarm(x, z))
    const added = []
    for (let i = 0; i < batchSize; i++) {
      const [sx, sz] = validSpawns[Math.floor(Math.random() * validSpawns.length)]
      const id = nextZombieIdRef.current++
      const z  = {
        id,
        x: sx + (Math.random() - 0.5) * 2,
        z: sz + (Math.random() - 0.5) * 2,
        hp: 10, lastHit: 0,
        _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0,
      }
      zombiesRef.current.push(z)
      added.push(z)
    }
    setZombieHps(prev => {
      const u = { ...prev }
      added.forEach(z => { u[z.id] = 10 })
      return u
    })
    spawnTimerRef.current = 0
    daySpawnRef.current   = zombiesRef.current.filter(z => z.hp > 0).length
  }, [dayPhase, profile?.dayCount])

  // Ensure zombies initialized on first mount
  useEffect(() => {
    if (zombiesRef.current.length === 0) {
      const dayCount   = profile?.dayCount || 1
      const spawnCount = Math.min(dayCount + 3, ALL_SPAWN_POS.length)
      const validSpawns = ALL_SPAWN_POS.filter(([x, z]) => !inFarm(x, z))
      const shuffled   = [...validSpawns].sort(() => Math.random() - 0.5)
      const newZombies = shuffled.slice(0, spawnCount).map(([x, z], i) => ({
        id: i, x, z, hp: 10, lastHit: 0,
        _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0
      }))
      zombiesRef.current = newZombies
      nextZombieIdRef.current = newZombies.length
      setZombieHps(Object.fromEntries(newZombies.map(z => [z.id, 10])))
    }
  }, [])

  const findPlotAtPos = useCallback((wx, wz) => {
    let best = -1, bestD = Infinity
    for (let i = 0; i < 5 * totalCols; i++) {
      const col = i % totalCols
      const row = Math.floor(i / totalCols)
      const px  = (col - 2) * PLOT_SPACING
      const pz  = (row - 2) * PLOT_SPACING
      const d   = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2)
      if (d < bestD) { bestD = d; best = i }
    }
    return bestD < REACH ? best : -1
  }, [totalCols])

  const handlePlotClick = useCallback((index) => {
    const col   = index % totalCols
    const row   = Math.floor(index / totalCols)
    const plotX = (col - 2) * PLOT_SPACING
    const plotZ = (row - 2) * PLOT_SPACING
    const dx    = playerPos.current.x - plotX
    const dz    = playerPos.current.z - plotZ
    if (Math.sqrt(dx * dx + dz * dz) > REACH) return
    swingRef.current = 1
    onPlotClick(index)
  }, [onPlotClick, totalCols])

  useFrame(({ camera, clock }, delta) => {
    const isNight = dayPhaseRef.current === 'night'

    // Smooth ambient light transition
    if (ambientRef.current) {
      const target = isNight ? 0.18 : 0.8
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.04
    }

    // ── Player movement ──────────────────────────────────────────────────────
    const turnLeft  = keys.current['KeyA'] || keys.current['ArrowLeft']
    const turnRight = keys.current['KeyD'] || keys.current['ArrowRight']
    const fwd       = keys.current['KeyW'] || keys.current['ArrowUp']
    const back      = keys.current['KeyS'] || keys.current['ArrowDown']

    if (turnLeft)  playerRot.current += TURN_SPEED * delta
    if (turnRight) playerRot.current -= TURN_SPEED * delta

    let moveDir = 0
    if (fwd)  moveDir += 1
    if (back) moveDir -= 1
    movingRef.current = moveDir !== 0

    if (keys.current['Space'] && playerPos.current.y <= 0.01) {
      jumpVel.current = 6.0
      keys.current['Space'] = false
    }
    jumpVel.current    -= 18 * delta
    playerPos.current.y = Math.max(0, playerPos.current.y + jumpVel.current * delta)
    if (playerPos.current.y <= 0) jumpVel.current = 0

    if (moveDir !== 0) {
      const r    = playerRot.current
      const newX = playerPos.current.x + Math.sin(r) * moveDir * MOVE_SPEED * delta
      const newZ = playerPos.current.z + Math.cos(r) * moveDir * MOVE_SPEED * delta

      // Compute east boundary dynamically based on farm size
      const eastBound = (totalColsRef.current - 3) * PLOT_SPACING + 4

      // House collision
      const inX = newX + PLAYER_R > HOUSE_AABB.minX && newX - PLAYER_R < HOUSE_AABB.maxX
      const inZ = newZ + PLAYER_R > HOUSE_AABB.minZ && newZ - PLAYER_R < HOUSE_AABB.maxZ
      if (inX && inZ) {
        const wasInX = playerPos.current.x + PLAYER_R > HOUSE_AABB.minX && playerPos.current.x - PLAYER_R < HOUSE_AABB.maxX
        const wasInZ = playerPos.current.z + PLAYER_R > HOUSE_AABB.minZ && playerPos.current.z - PLAYER_R < HOUSE_AABB.maxZ
        if (!wasInX) {
          playerPos.current.z = Math.max(-35, Math.min(35, newZ))
        } else if (!wasInZ) {
          playerPos.current.x = Math.max(-16, Math.min(eastBound, newX))
        }
      } else {
        // Castle walls — only allow passage through gate opening
        const inCastle = newZ > 13  // Try to enter castle grounds
        const inGateX   = newX > -2.5 && newX < 2.5  // Gate opening
        const atGateZ   = Math.abs(newZ - 13) < 2  // Near gate threshold

        // Block entry if not aligned with gate
        if (inCastle && !inGateX && atGateZ) {
          // At north wall but not in gate — block movement
          playerPos.current.x = Math.max(-16, Math.min(eastBound, playerPos.current.x))
          playerPos.current.z = 12.5  // Push back outside
        } else {
          playerPos.current.x = Math.max(-16, Math.min(eastBound, newX))
          playerPos.current.z = Math.max(-35, Math.min(35, newZ))
        }
      }
    }

    if (playerRef.current) {
      playerRef.current.position.copy(playerPos.current)
      playerRef.current.rotation.y = playerRot.current
    }

    const px  = playerPos.current.x
    const pz  = playerPos.current.z
    const now = Date.now()

    // ── Zombie trickle spawn during night (scales with day count) ────────────
    if (isNight) {
      spawnTimerRef.current += delta
      const dayCount      = dayCountRef.current
      const nightProgress = Math.min(spawnTimerRef.current / NIGHT_SECONDS, 1)
      // Trickle: 2 per second at max, scaling with day count
      const maxTrickle = Math.floor(dayCount * 2 + nightProgress * dayCount * 2)
      const trickleSpawned = zombiesRef.current.filter(z => z.id >= daySpawnRef.current).length

      if (trickleSpawned < maxTrickle) {
        const validSpawns = ALL_SPAWN_POS.filter(([sx, sz]) => !inFarm(sx, sz))
        const [sx, sz] = validSpawns[Math.floor(Math.random() * validSpawns.length)]
        const newZ = {
          id: nextZombieIdRef.current++,
          x: sx + (Math.random() - 0.5) * 2,
          z: sz + (Math.random() - 0.5) * 2,
          hp: 10, lastHit: 0,
          _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0,
        }
        zombiesRef.current.push(newZ)
        setZombieHps(prev => ({ ...prev, [newZ.id]: 10 }))
      }
    }

    // ── Zombie AI ────────────────────────────────────────────────────────────
    const ZOMBIE_SPEED  = 1.6
    const WANDER_SPEED  = 0.6
    const HIT_DIST      = 1.2
    const HIT_COOLDOWN  = 1000
    const playerInWild  = pz < WILD_BOUNDARY   // player entered wilderness

    let hpChanged  = false
    const hpUpdates = {}
    let totalZombiesAlive = 0

    for (const z of zombiesRef.current) {
      if (z.hp <= 0) continue
      totalZombiesAlive++
      const dx   = px - z.x
      const dz   = pz - z.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (isNight) {
        // If gate is intact, block zombies from entering castle unless gate is broken
        const gateIntact = gateHpRef.current > 0
        const approachingGate = z.z > 10 && z.z < 14 && Math.abs(z.x) < 3.5
        if (gateIntact && approachingGate) {
          if (now - gateHitRef.current > 2000) {
            gateHitRef.current = now
            const newGateHp = Math.max(0, gateHpRef.current - 1)
            gateHpRef.current = newGateHp
            setGateHp(newGateHp)
          }
        } else if (dist > HIT_DIST) {
          // Night: chase player
          z.x += (dx / dist) * ZOMBIE_SPEED * delta
          z.z += (dz / dist) * ZOMBIE_SPEED * delta
        }
      } else {
        // Day: zombies wander in wilderness; attack player if they enter wilderness
        const inWild = z.z < WILD_BOUNDARY
        if (!inWild) continue  // daytime zombies not yet in wilderness stay put

        if (playerInWild && dist < 18) {
          // Player entered wilderness — chase and attack
          if (dist > HIT_DIST) {
            z.x += (dx / dist) * ZOMBIE_SPEED * delta
            z.z += (dz / dist) * ZOMBIE_SPEED * delta
          }
          if (dist > 0.1) z._wanderDir = Math.atan2(dx, dz)
        } else {
          // Random wander
          z._wanderTimer = (z._wanderTimer || 0) - delta
          if (z._wanderTimer <= 0) {
            z._wanderDir = Math.random() * Math.PI * 2
            z._wanderTimer = 1.5 + Math.random() * 2.5
          }
          z.x += Math.sin(z._wanderDir) * WANDER_SPEED * delta
          z.z += Math.cos(z._wanderDir) * WANDER_SPEED * delta
          // Bounce off wilderness boundary (don't let them walk into the farm area)
          if (z.z >= WILD_BOUNDARY - 0.5) { z._wanderDir += Math.PI; z.z = WILD_BOUNDARY - 0.6 }
          if (z.z < -38) { z._wanderDir += Math.PI; z.z = -37.5 }
          if (z.x < -18) { z._wanderDir += Math.PI * 0.5; z.x = -17.5 }
          if (z.x >  18) { z._wanderDir -= Math.PI * 0.5; z.x =  17.5 }
        }

        // Update mesh
        const mesh = zombieMeshMap.current.get(z.id)
        if (mesh) {
          mesh.position.x = z.x
          mesh.position.z = z.z
          if (dist > 0.1) mesh.rotation.y = Math.atan2(dx, dz)
        }

        // Day attack damage if player in wilderness
        if (playerInWild && dist < HIT_DIST && now - z.lastHit > HIT_COOLDOWN) {
          z.lastHit = now
          onPlayerDamaged?.()
        }
        continue
      }

      // Night: update mesh position
      const mesh = zombieMeshMap.current.get(z.id)
      if (mesh) {
        mesh.position.x = z.x
        mesh.position.z = z.z
        if (dist > 0.1) mesh.rotation.y = Math.atan2(dx, dz)
      }

      // Night: deal damage to player
      if (dist < HIT_DIST && now - z.lastHit > HIT_COOLDOWN) {
        z.lastHit = now
        onPlayerDamaged?.()
      }
    }

    // Check if all zombies cleared during night — fire once per night
    if (isNight && totalZombiesAlive === 0 && !allZombiesDeadRef.current) {
      allZombiesDeadRef.current = true
      onPlayerDamaged?.({ clearReward: true })  // Pass special flag
    } else if (!isNight) {
      allZombiesDeadRef.current = false
    }

    // ── Zombies destroy plants (night only) ──────────────────────────────────
    if (isNight) {
      const plotsToDestroy = []
      for (const z of zombiesRef.current) {
        if (z.hp <= 0) continue
        if (z.z <= WILD_BOUNDARY) continue
        for (let i = 0; i < plots.length; i++) {
          if (!plots[i]) continue
          const col = i % totalCols
          const row = Math.floor(i / totalCols)
          const ppx = (col - 2) * PLOT_SPACING
          const ppz = (row - 2) * PLOT_SPACING
          if (Math.sqrt((z.x - ppx) ** 2 + (z.z - ppz) ** 2) < 1.5) {
            plotsToDestroy.push(i)
          }
        }
      }
      if (plotsToDestroy.length > 0) {
        onPlayerDamaged?.({ destroyPlots: plotsToDestroy })
      }
    }

    // ── Arrow projectiles (bow + archer towers) — positions updated via refs ──
    const ARROW_SPEED = 22
    const deadArrows  = new Set()
    for (const arr of arrowsRef.current) {
      arr.x += arr.dx * ARROW_SPEED * delta
      arr.z += arr.dz * ARROW_SPEED * delta
      arr.remainingDist -= ARROW_SPEED * delta
      // Update mesh position directly — no React re-render needed
      const arrowMesh = arrowMeshMap.current.get(arr.id)
      if (arrowMesh) { arrowMesh.position.x = arr.x; arrowMesh.position.z = arr.z }
      if (arr.remainingDist <= 0) { deadArrows.add(arr.id); continue }
      for (const z of zombiesRef.current) {
        if (z.hp <= 0) continue
        if (Math.sqrt((arr.x - z.x) ** 2 + (arr.z - z.z) ** 2) < 0.8) {
          const wasAlive = z.hp > 0
          z.hp = Math.max(0, z.hp - arr.damage)
          // Update HP bar directly via ref
          const hpFill = zombieHpBarMap.current.get(z.id)
          if (hpFill) { const f = z.hp/10; hpFill.scale.x = Math.max(0.001,f); hpFill.position.x = -0.35*(1-Math.max(0.001,f)) }
          if (wasAlive && z.hp <= 0) { hpUpdates[z.id] = 0; hpChanged = true; onPlayerDamaged?.({ killed: true }) }
          deadArrows.add(arr.id)
          break
        }
      }
    }
    if (deadArrows.size > 0) {
      arrowsRef.current = arrowsRef.current.filter(a => !deadArrows.has(a.id))
      setArrowRenders([...arrowsRef.current])
    }

    // ── Archer tower auto-shoot (night only) ──────────────────────────────────
    if (isNight) {
      const archerStats = getArcherStats(castleUpgradesRef.current)
      if (archerStats) {
        archerTimer.current += delta
        if (archerTimer.current >= archerStats.cooldown) {
          archerTimer.current = 0
          for (const [tx, tz] of TOWER_POSITIONS) {
            let nearestZ = null, nearestDist = 30
            for (const z of zombiesRef.current) {
              if (z.hp <= 0) continue
              const d = Math.sqrt((z.x - tx) ** 2 + (z.z - tz) ** 2)
              if (d < nearestDist) { nearestDist = d; nearestZ = z }
            }
            if (nearestZ) {
              const adx = nearestZ.x - tx, adz = nearestZ.z - tz
              const dist = Math.sqrt(adx * adx + adz * adz)
              arrowsRef.current.push({
                id: nextArrowId.current++,
                x: tx, y: 2.8, z: tz,
                dx: adx / dist, dz: adz / dist,
                remainingDist: dist + 4,
                damage: archerStats.damage,
              })
            }
          }
          setArrowRenders([...arrowsRef.current])
        }
      } else {
        archerTimer.current = 0
      }
    }

    // ── NPC proximity ────────────────────────────────────────────────────────
    let closestNpc  = null
    let closestDist = 2.5
    for (const npc of CASTLE_NPCS) {
      const d = Math.sqrt((px - npc.x) ** 2 + (pz - npc.z) ** 2)
      if (d < closestDist) { closestDist = d; closestNpc = npc.id }
    }
    if (closestNpc !== nearNpcRef.current) {
      nearNpcRef.current = closestNpc
      onNearNpc?.(closestNpc)
    }

    // ── House proximity ───────────────────────────────────────────────────────
    const hdx      = px - HOUSE_POS[0]
    const hdz      = pz - HOUSE_POS[2]
    const houseDist = Math.sqrt(hdx * hdx + hdz * hdz)
    const near      = houseDist < 3.5
    if (near !== nearRef.current) {
      nearRef.current = near
      onNearHouse?.(near)
    }

    // ── E key priority chain ──────────────────────────────────────────────────
    if (keys.current['KeyE']) {
      keys.current['KeyE'] = false

      if (isNight && near) {
        // 1. Sleep through night
        onSleep?.()
      } else if (nearNpcRef.current) {
        // 2. Talk to NPC
        onTalkToNpc?.(nearNpcRef.current)
      } else {
        // 3. Try to attack a zombie in front
        const r     = playerRot.current
        const isBow = weaponRangeRef.current > 0
        let zombieHit = false

        if (isBow) {
          // Bow: fire arrow projectile (10 plot-spaces max range)
          const bowMaxDist = 10 * PLOT_SPACING
          arrowsRef.current.push({
            id: nextArrowId.current++,
            x: px + Math.sin(r) * 0.6, y: 1.1, z: pz + Math.cos(r) * 0.6,
            dx: Math.sin(r), dz: Math.cos(r),
            remainingDist: bowMaxDist,
            damage: attackDmgRef.current || 1,
          })
          setArrowRenders([...arrowsRef.current])
          swingRef.current = 1
          zombieHit = true   // prevent melee fallthrough
        } else {
          // Melee: instant hit — range is 1 plot distance
          const atkDist = PLOT_SPACING
          const atkX    = px + Math.sin(r) * atkDist
          const atkZ    = pz + Math.cos(r) * atkDist
          for (const z of zombiesRef.current) {
            if (z.hp <= 0) continue
            const d = Math.sqrt((atkX - z.x) ** 2 + (atkZ - z.z) ** 2)
            if (d < PLOT_SPACING) {
              const wasAlive = z.hp > 0
              z.hp = Math.max(0, z.hp - (attackDmgRef.current || 1))
              // Update HP bar via ref
              const hpFill = zombieHpBarMap.current.get(z.id)
              if (hpFill) { const f = z.hp/10; hpFill.scale.x = Math.max(0.001,f); hpFill.position.x = -0.35*(1-Math.max(0.001,f)) }
              zombieHit = true
              if (wasAlive && z.hp <= 0) { hpUpdates[z.id] = 0; hpChanged = true; onPlayerDamaged?.({ killed: true }) }
              break
            }
          }
        }
        if (!zombieHit) {
          // Check if near a tree to chop
          const TREE_REACH = 2.8
          let treeChopped = false
          if (chopDmgRef.current > 0 && Date.now() - chopCoolRef.current > 600) {
            for (let tid = 0; tid < TREE_POSITIONS.length; tid++) {
              if (choppedRef.current.has(tid)) continue
              const [tx, tz] = TREE_POSITIONS[tid]
              const td = Math.sqrt((px - tx) ** 2 + (pz - tz) ** 2)
              if (td < TREE_REACH) {
                chopCoolRef.current = Date.now()
                swingRef.current = 1
                const prevHp = treeHpsRef.current[tid] ?? TREE_MAX_HP
                const newHp  = Math.max(0, prevHp - chopDmgRef.current)
                treeHpsRef.current[tid] = newHp
                setTreeHps(prev => ({ ...prev, [tid]: newHp }))
                if (newHp <= 0) {
                  choppedRef.current = new Set([...choppedRef.current, tid])
                  setChoppedTrees(new Set(choppedRef.current))
                  onTreeChopped?.(treeBaseReward)
                }
                treeChopped = true
                break
              }
            }
          }
          if (!treeChopped) {
            if (near) {
              // 4. Enter house (day)
              onHouseEnter?.()
            } else {
              // 5. Interact with front plot
              const fpx = px + Math.sin(r) * PLOT_SPACING
              const fpz = pz + Math.cos(r) * PLOT_SPACING
              const idx = findPlotAtPos(fpx, fpz)
              if (idx >= 0) {
                swingRef.current = 1
                onPlotClick(idx)
              }
            }
          }
        }
      }
    }

    if (hpChanged) setZombieHps(prev => ({ ...prev, ...hpUpdates }))

    // ── Centralized zombie leg animation (one loop, no per-zombie useFrame) ──
    const t = clock.elapsedTime
    for (const z of zombiesRef.current) {
      if (z.hp <= 0) continue
      const legs = zombieLegMap.current.get(z.id)
      if (!legs) continue
      const isMoving = isNight || z.z < WILD_BOUNDARY
      if (isMoving) {
        const swing = Math.sin((t + z.id * 0.31) * 8) * 0.5
        if (legs.left)  legs.left.rotation.x  =  swing
        if (legs.right) legs.right.rotation.x = -swing
      }
    }

    // ── Third-person camera ───────────────────────────────────────────────────
    const a = playerRot.current
    _camTarget.set(px - Math.sin(a) * 7, playerPos.current.y + 5.5, pz - Math.cos(a) * 7)
    camera.position.lerp(_camTarget, 0.07)
    _lookAt.set(px, playerPos.current.y + 1.4, pz)
    camera.lookAt(_lookAt)
  })

  const isNight  = dayPhase === 'night'
  const skyColor = isNight ? '#0f172a' : '#7dd3fc'
  const fogColor = isNight ? '#0f172a' : '#bae6fd'

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isNight ? 0.18 : 0.8}/>
      <directionalLight position={[10,16,6]} intensity={isNight ? 0.25 : 1.1} castShadow
        shadow-mapSize={[2048,2048]} shadow-camera-far={70}
        shadow-camera-left={-25} shadow-camera-right={25}
        shadow-camera-top={25} shadow-camera-bottom={-25}/>
      <directionalLight position={[-8,6,-5]} intensity={isNight ? 0.05 : 0.3}/>

      <color attach="background" args={[skyColor]}/>
      <fog attach="fog" args={[fogColor, 30, 60]}/>

      <Ground/>
      <Clouds/>
      <Fence totalCols={totalCols}/>
      <House3D onEnter={onHouseEnter} houseLevel={profile?.houseLevel || 0}/>
      <Wilderness treeHps={treeHps} choppedTrees={choppedTrees}/>
      <CastleCity gateHp={gateHp}/>

      {/* Archer watch towers (only when archers upgrade is owned) */}
      {profile?.castleUpgrades?.archers && TOWER_POSITIONS.map(([tx, tz], i) => (
        <WatchTower key={`tower${i}`} x={tx} z={tz}/>
      ))}

      {Array.from({length: 5 * totalCols}).map((_,i) => (
        <GardenPlot key={i} index={i} plot={plots[i]??null} onPlotClick={handlePlotClick} totalCols={totalCols}/>
      ))}

      {zombiesRef.current.map(z => (
        <ZombieBody key={z.id} zombie={z} hp={zombieHps[z.id] ?? 10}
          meshMapRef={zombieMeshMap} legMapRef={zombieLegMap} hpBarMapRef={zombieHpBarMap}/>
      ))}

      {/* Arrow projectiles — initial props only; position updated via meshMapRef */}
      {arrowRenders.map(a => (
        <ArrowProjectile key={a.id} id={a.id}
          initX={a.x} initY={a.y} initZ={a.z} initDx={a.dx} initDz={a.dz}
          meshMapRef={arrowMeshMap}/>
      ))}

      <PlayerCharacter playerRef={playerRef} outfit={outfit} swingRef={swingRef}/>
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function Garden3D({ plots, onPlotClick, profile, outfit, onNearHouse, onHouseEnter,
                                   dayPhase, onPlayerDamaged, onTalkToNpc, onNearNpc, onSleep,
                                   attackDamage, weaponRange, equipSource, chopDamage, onTreeChopped, treeBaseReward }) {
  return (
    <Canvas shadows camera={{position:[0,8,13],fov:55}} style={{width:'100%',height:'100%',display:'block'}}>
      <GameScene plots={plots} onPlotClick={onPlotClick} profile={profile}
        outfit={outfit} onNearHouse={onNearHouse} onHouseEnter={onHouseEnter}
        dayPhase={dayPhase} onPlayerDamaged={onPlayerDamaged} onTalkToNpc={onTalkToNpc}
        onNearNpc={onNearNpc} onSleep={onSleep} attackDamage={attackDamage} weaponRange={weaponRange}
        equipSource={equipSource} chopDamage={chopDamage} onTreeChopped={onTreeChopped} treeBaseReward={treeBaseReward}/>
    </Canvas>
  )
}
