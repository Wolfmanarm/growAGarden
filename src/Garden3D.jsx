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

const INIT_ZOMBIES = [
  { id:0, x:-4, z:-20 }, { id:1, x:4,  z:-22 }, { id:2, x:-6, z:-25 },
  { id:3, x:2,  z:-18 }, { id:4, x:-2, z:-28 }, { id:5, x:6,  z:-23 },
]

// Spawn positions for additional zombies (during progressive nights)
const EXTRA_SPAWN_POS = [
  [-8, -16], [8, -19], [-10, -24], [10, -26], [-3, -32], [5, -30],
  [-7, -21], [3, -25], [-12, -18], [12, -22], [-5, -35], [7, -17],
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
function Fence({totalRows}) {
  const hw = 5.1
  const hh = ((totalRows-1)/2)*PLOT_SPACING + 1.1
  const Rail = ({pos,rot,len}) => (
    <mesh position={pos} rotation={rot} castShadow>
      <boxGeometry args={[len,.07,.07]}/>
      <meshLambertMaterial color="#d97706"/>
    </mesh>
  )
  return (
    <group>
      {[-2,-1,0,1,2].map(i=><FencePost key={`f${i}`} x={i*PLOT_SPACING} z={hh}/>)}
      <Rail pos={[0,.4,hh]}  rot={[0,0,0]}        len={hw*2}/>
      <Rail pos={[0,.7,hh]}  rot={[0,0,0]}        len={hw*2}/>
      {[-2,-1,0,1,2].map(i=><FencePost key={`b${i}`} x={i*PLOT_SPACING} z={-hh}/>)}
      <Rail pos={[0,.4,-hh]} rot={[0,0,0]}        len={hw*2}/>
      <Rail pos={[0,.7,-hh]} rot={[0,0,0]}        len={hw*2}/>
      {Array.from({length:totalRows}).map((_,r)=>{
        const z=(r-(totalRows-1)/2)*PLOT_SPACING
        return <FencePost key={`l${r}`} x={-hw} z={z}/>
      })}
      <Rail pos={[-hw,.4,0]} rot={[0,Math.PI/2,0]} len={hh*2}/>
      <Rail pos={[-hw,.7,0]} rot={[0,Math.PI/2,0]} len={hh*2}/>
      {Array.from({length:totalRows}).map((_,r)=>{
        const z=(r-(totalRows-1)/2)*PLOT_SPACING
        return <FencePost key={`r${r}`} x={hw} z={z}/>
      })}
      <Rail pos={[hw,.4,0]}  rot={[0,Math.PI/2,0]} len={hh*2}/>
      <Rail pos={[hw,.7,0]}  rot={[0,Math.PI/2,0]} len={hh*2}/>
    </group>
  )
}

// ─── Cabin House (task 9) ─────────────────────────────────────────────────────
function House3D({ onEnter, houseLevel = 0 }) {
  const logColor  = houseLevel >= 3 ? '#6B3A2A' : '#5C2E1A'
  const roofColor = houseLevel >= 4 ? '#1e1b4b' : houseLevel >= 2 ? '#1c1917' : '#292524'
  const chinkColor = '#d6b896'  // mortar between logs

  return (
    <group position={HOUSE_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* Stone foundation */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.18, 4.0]} />
        <meshLambertMaterial color="#78716c" />
      </mesh>

      {/* Log walls — stacked horizontal log layers */}
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i} position={[0, 0.22 + i*0.36, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.32, 3.6]} />
          <meshLambertMaterial color={i%2===0 ? logColor : '#7c4a30'} />
        </mesh>
      ))}
      {/* Chinking lines between logs */}
      {[1,2,3,4,5].map(i => (
        <mesh key={i} position={[0, 0.38 + (i-1)*0.36, 0]}>
          <boxGeometry args={[4.22, 0.06, 3.62]} />
          <meshLambertMaterial color={chinkColor} />
        </mesh>
      ))}

      {/* Steep A-frame log roof */}
      <mesh position={[0, 2.45, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.4, 0.1, 3.8]} />
        <meshLambertMaterial color={roofColor} />
      </mesh>
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[0, 3.1, s * 1.4]} rotation={[s * 0.65, 0, 0]} castShadow>
          <boxGeometry args={[4.5, 0.12, 2.0]} />
          <meshLambertMaterial color={roofColor} />
        </mesh>
      ))}
      {/* Roof ridge beam */}
      <mesh position={[0, 3.72, 0]} castShadow>
        <boxGeometry args={[4.6, 0.2, 0.22]} />
        <meshLambertMaterial color="#1c1917" />
      </mesh>

      {/* Porch posts */}
      {[-1.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 2.2]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.8, 8]} />
          <meshLambertMaterial color={logColor} />
        </mesh>
      ))}
      {/* Porch beam */}
      <mesh position={[0, 1.82, 2.2]} castShadow>
        <boxGeometry args={[3.4, 0.16, 0.16]} />
        <meshLambertMaterial color={logColor} />
      </mesh>
      {/* Porch floor */}
      <mesh position={[0, 0.19, 2.35]} receiveShadow>
        <boxGeometry args={[3.6, 0.1, 0.85]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>

      {/* Door (clickable) */}
      <mesh position={[0, 0.9, 1.82]} onClick={onEnter} castShadow>
        <boxGeometry args={[0.9, 1.6, 0.1]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>
      {/* Door planks detail */}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 1.88]}>
          <boxGeometry args={[0.35, 1.5, 0.04]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
      ))}
      {/* Door knob */}
      <mesh position={[0.32, 0.8, 1.94]}>
        <sphereGeometry args={[0.06, 8, 8]} /><meshLambertMaterial color="#fbbf24" />
      </mesh>

      {/* Small cabin windows */}
      {[-1.3, 1.3].map((x, i) => (
        <group key={i} position={[x, 1.3, 1.85]}>
          <mesh><boxGeometry args={[0.55, 0.5, 0.06]} /><meshLambertMaterial color="#bae6fd" /></mesh>
          <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.05, 0.5, 0.02]} /><meshLambertMaterial color="#fff" /></mesh>
          <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.55, 0.05, 0.02]} /><meshLambertMaterial color="#fff" /></mesh>
        </group>
      ))}

      {/* Stone chimney */}
      <mesh position={[1.3, 2.8, -0.6]} castShadow>
        <boxGeometry args={[0.6, 1.1, 0.6]} /><meshLambertMaterial color="#57534e" />
      </mesh>
      <mesh position={[1.3, 3.4, -0.6]}>
        <boxGeometry args={[0.72, 0.12, 0.72]} /><meshLambertMaterial color="#44403c" />
      </mesh>

      {/* Stone path */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.18, 2.9 + i * 0.5]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.28, 8]} /><meshLambertMaterial color="#a8a29e" />
        </mesh>
      ))}

      {/* Mailbox */}
      <group position={[1.7, 0, 2.8]}>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.12, 0.7, 0.12]} /><meshLambertMaterial color={logColor} /></mesh>
        <mesh position={[0, 0.96, 0]} castShadow><boxGeometry args={[0.3, 0.2, 0.2]} /><meshLambertMaterial color="#2563eb" /></mesh>
      </group>

      {/* Level star signs */}
      {houseLevel > 0 && (
        <mesh position={[-1.6, 1.0, 1.9]}>
          <boxGeometry args={[0.55, 0.25, 0.05]} /><meshLambertMaterial color="#fef9c3" />
        </mesh>
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

function GardenPlot({ index, plot, onPlotClick, totalRows }) {
  const col = index % 5
  const row = Math.floor(index / 5)
  const x   = (col-2)*PLOT_SPACING
  const z   = (row-(totalRows-1)/2)*PLOT_SPACING

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
function PineTree({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.1, 6]}/>
        <meshLambertMaterial color="#78350f"/>
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 1.1 + i * 0.65, 0]} castShadow>
          <coneGeometry args={[0.85 - i * 0.2, 1.0, 7]}/>
          <meshLambertMaterial color={i % 2 === 0 ? '#14532d' : '#166534'}/>
        </mesh>
      ))}
    </group>
  )
}

function Wilderness() {
  const trees = useMemo(() => [
    [-8,-18],[-3,-20],[5,-19],[9,-17],[-6,-23],[0,-25],[7,-24],
    [-9,-27],[3,-28],[-4,-30],[8,-21],[2,-16],[-7,-15],[-1,-22],[6,-26],
  ].map(([x,z],i) => ({ x, z, id: i })), [])

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
            {/* Posts */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 1.0, 0.1]}/>
              <meshLambertMaterial color="#8b5a3c"/>
            </mesh>
            {/* Rails */}
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[2.8, 0.08, 0.08]}/>
              <meshLambertMaterial color="#8b5a3c"/>
            </mesh>
            <mesh position={[0, 0.65, 0]} castShadow>
              <boxGeometry args={[2.8, 0.08, 0.08]}/>
              <meshLambertMaterial color="#a0724d"/>
            </mesh>
          </group>
        )
      })}
      {trees.map(t => <PineTree key={t.id} x={t.x} z={t.z}/>)}
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
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.16, 3.4]}/>
        <meshLambertMaterial color="#a8a29e"/>
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.0, 3.0]}/>
        <meshLambertMaterial color="#e7e5e4"/>
      </mesh>
      {/* Roof slabs */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[3.8, 0.14, 3.4]}/>
        <meshLambertMaterial color={color}/>
      </mesh>
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[0, 2.75, s * 1.3]} rotation={[s * 0.5, 0, 0]} castShadow>
          <boxGeometry args={[3.9, 0.12, 1.7]}/>
          <meshLambertMaterial color={color}/>
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.88, 1.52]} castShadow>
        <boxGeometry args={[0.72, 1.56, 0.08]}/>
        <meshLambertMaterial color="#78350f"/>
      </mesh>
      {/* Windows */}
      {[-1.1, 1.1].map((wx, i) => (
        <mesh key={i} position={[wx, 1.2, 1.52]}>
          <boxGeometry args={[0.5, 0.5, 0.06]}/>
          <meshLambertMaterial color="#bae6fd"/>
        </mesh>
      ))}
      {/* Sign board */}
      <mesh position={[0, 2.08, 1.56]} castShadow>
        <boxGeometry args={[1.5, 0.38, 0.08]}/>
        <meshLambertMaterial color="#fef3c7"/>
      </mesh>
    </group>
  )
}

function CastleCity() {
  const wallColor = '#78716c'
  const wallH     = 2.2
  const wallW     = 0.6

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

      {/* Walls */}
      <mesh position={[0, wallH/2, 13]} castShadow>
        <boxGeometry args={[24, wallH, wallW]}/><meshLambertMaterial color={wallColor}/>
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

      {/* Gate opening */}
      <mesh position={[0, 0.8, 13]}>
        <boxGeometry args={[2.2, 1.6, 0.65]}/><meshLambertMaterial color="#292524"/>
      </mesh>

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
function ZombieBody({ zombie, hp, meshMapRef }) {
  const ref = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(zombie.x, 0, zombie.z)
      meshMapRef.current.set(zombie.id, ref.current)
    }
    return () => meshMapRef.current.delete(zombie.id)
  }, [zombie.id, meshMapRef])

  // Walking animation
  useFrame(({ clock }) => {
    if (leftLegRef.current && rightLegRef.current) {
      const t = clock.elapsedTime + zombie.id  // Stagger by ID
      const swing = Math.sin(t * 8) * 0.5  // Faster swing for undead gait
      leftLegRef.current.rotation.x = swing
      rightLegRef.current.rotation.x = -swing
    }
  })

  if (hp <= 0) return null
  const hpFrac = hp / 10

  return (
    <group ref={ref}>
      {/* Legs */}
      {[-0.12, 0.12].map((lx, i) => (
        <group key={i} ref={i === 0 ? leftLegRef : rightLegRef} position={[lx, 0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.56, 0.18]}/>
            <meshLambertMaterial color="#166534"/>
          </mesh>
        </group>
      ))}
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
      {/* HP bar */}
      <group position={[0, 1.82, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.09, 0.04]}/><meshLambertMaterial color="#1e293b"/>
        </mesh>
        <mesh position={[-(1 - hpFrac) * 0.35, 0, 0.03]} scale={[hpFrac, 1, 1]}>
          <boxGeometry args={[0.7, 0.09, 0.04]}/><meshLambertMaterial color="#ef4444"/>
        </mesh>
      </group>
    </group>
  )
}

// ─── Camera + movement ────────────────────────────────────────────────────────
const _camTarget = new THREE.Vector3()
const _lookAt    = new THREE.Vector3()
const MOVE_SPEED = 4.5
const TURN_SPEED = 2.4
const REACH      = 2.6   // max distance to interact with a plot (task 1)

// House AABB in world space (task 6): house at [-11,0,0] rotated 90°
// Unrotated: 4 wide (x) × 3.4 deep (z) → after 90° rot: 3.4 wide (x) × 4 deep (z)
const HOUSE_AABB = { minX: -12.7, maxX: -9.3, minZ: -2.0, maxZ: 2.0 }
const PLAYER_R   = 0.4

function GameScene({ plots, onPlotClick, profile, outfit, onNearHouse, onHouseEnter,
                     dayPhase, onPlayerDamaged, onTalkToNpc, onNearNpc, onSleep, attackDamage, weaponRange, equipSource }) {
  const playerRef    = useRef()
  const playerPos    = useRef(new THREE.Vector3(0, 0, 6))
  const playerRot    = useRef(Math.PI)
  const jumpVel      = useRef(0)
  const keys         = useRef({})
  const movingRef    = useRef(false)
  const nearRef      = useRef(false)
  const swingRef     = useRef(0)
  const ambientRef   = useRef()
  const totalRows    = 5 + (profile?.extraRows || 0)

  // Keep latest prop values accessible inside useFrame without stale closures
  const dayPhaseRef     = useRef(dayPhase)
  const attackDmgRef    = useRef(attackDamage)
  const weaponRangeRef  = useRef(weaponRange)
  const equipSourceRef  = useRef(equipSource)
  useEffect(() => { dayPhaseRef.current = dayPhase },     [dayPhase])
  useEffect(() => { attackDmgRef.current = attackDamage }, [attackDamage])
  useEffect(() => { weaponRangeRef.current = weaponRange }, [weaponRange])
  useEffect(() => { equipSourceRef.current = equipSource }, [equipSource])

  // Zombie system — positions live in refs, only HP triggers re-render
  const zombiesRef    = useRef(INIT_ZOMBIES.map(z => ({ ...z, hp: 10, lastHit: 0, _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0 })))
  const zombieMeshMap = useRef(new Map())
  const [zombieHps, setZombieHps] = useState(() => Object.fromEntries(INIT_ZOMBIES.map(z => [z.id, 10])))
  const allZombiesDeadRef = useRef(false)
  const nextZombieIdRef = useRef(6)
  const spawnTimerRef = useRef(0)

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
    if (playerRef.current) playerRef.current._movingRef = movingRef
  })

  // Initialize and respawn zombies at day start or mount
  useEffect(() => {
    const initZombies = () => {
      const newZombies = INIT_ZOMBIES.map(z => ({
        id: z.id, x: z.x, z: z.z,
        hp: 10, lastHit: 0,
        _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0
      }))
      zombiesRef.current = newZombies
      nextZombieIdRef.current = 6
      spawnTimerRef.current = 0
      setZombieHps(Object.fromEntries(newZombies.map(z => [z.id, 10])))
      allZombiesDeadRef.current = false
    }

    if (dayPhase === 'day') {
      initZombies()
    }
  }, [dayPhase])

  // Ensure zombies initialized on first mount
  useEffect(() => {
    if (zombiesRef.current.length === 0) {
      const newZombies = INIT_ZOMBIES.map(z => ({
        id: z.id, x: z.x, z: z.z,
        hp: 10, lastHit: 0,
        _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0
      }))
      zombiesRef.current = newZombies
      setZombieHps(Object.fromEntries(newZombies.map(z => [z.id, 10])))
    }
  }, [])

  const findPlotAtPos = useCallback((wx, wz) => {
    let best = -1, bestD = Infinity
    for (let i = 0; i < totalRows * 5; i++) {
      const col = i % 5
      const row = Math.floor(i / 5)
      const px  = (col - 2) * PLOT_SPACING
      const pz  = (row - (totalRows - 1) / 2) * PLOT_SPACING
      const d   = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2)
      if (d < bestD) { bestD = d; best = i }
    }
    return bestD < REACH ? best : -1
  }, [totalRows])

  const handlePlotClick = useCallback((index) => {
    const col   = index % 5
    const row   = Math.floor(index / 5)
    const plotX = (col - 2) * PLOT_SPACING
    const plotZ = (row - (totalRows - 1) / 2) * PLOT_SPACING
    const dx    = playerPos.current.x - plotX
    const dz    = playerPos.current.z - plotZ
    if (Math.sqrt(dx * dx + dz * dz) > REACH) return
    swingRef.current = 1
    onPlotClick(index)
  }, [onPlotClick, totalRows])

  useFrame(({ camera }, delta) => {
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

      // House collision
      const inX = newX + PLAYER_R > HOUSE_AABB.minX && newX - PLAYER_R < HOUSE_AABB.maxX
      const inZ = newZ + PLAYER_R > HOUSE_AABB.minZ && newZ - PLAYER_R < HOUSE_AABB.maxZ
      if (inX && inZ) {
        const wasInX = playerPos.current.x + PLAYER_R > HOUSE_AABB.minX && playerPos.current.x - PLAYER_R < HOUSE_AABB.maxX
        const wasInZ = playerPos.current.z + PLAYER_R > HOUSE_AABB.minZ && playerPos.current.z - PLAYER_R < HOUSE_AABB.maxZ
        if (!wasInX) {
          playerPos.current.z = Math.max(-35, Math.min(35, newZ))
        } else if (!wasInZ) {
          playerPos.current.x = Math.max(-16, Math.min(16, newX))
        }
      } else {
        // Castle walls — only allow passage through gate opening
        const inCastle = newZ > 13  // Try to enter castle grounds
        const inGateX   = newX > -2.5 && newX < 2.5  // Gate opening
        const atGateZ   = Math.abs(newZ - 13) < 2  // Near gate threshold

        // Block entry if not aligned with gate
        if (inCastle && !inGateX && atGateZ) {
          // At north wall but not in gate — block movement
          playerPos.current.x = Math.max(-16, Math.min(16, playerPos.current.x))
          playerPos.current.z = 12.5  // Push back outside
        } else {
          playerPos.current.x = Math.max(-16, Math.min(16, newX))
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

    // ── Zombie spawn during night ────────────────────────────────────────────
    if (isNight) {
      spawnTimerRef.current += delta
      const nightProgress = (spawnTimerRef.current / (NIGHT_SECONDS * 1000)) * 100  // 0-100%
      const spawnsToMake = Math.floor(nextZombieIdRef.current - 6)
      const maxSpawns = Math.floor(2 + nightProgress * 0.15)  // Scale from 2 to 3.5 spawns per night

      if (nextZombieIdRef.current - 6 < maxSpawns && nextZombieIdRef.current < 18) {
        // Spawn a new zombie
        const spawnIdx = Math.floor(Math.random() * EXTRA_SPAWN_POS.length)
        const [sx, sz] = EXTRA_SPAWN_POS[spawnIdx]
        const newZombie = { id: nextZombieIdRef.current, x: sx, z: sz, hp: 10, lastHit: 0, _wanderDir: Math.random() * Math.PI * 2, _wanderTimer: 0 }
        zombiesRef.current.push(newZombie)
        setZombieHps(prev => ({ ...prev, [newZombie.id]: 10 }))
        nextZombieIdRef.current++
      }
    }

    // ── Zombie AI ────────────────────────────────────────────────────────────
    const ZOMBIE_SPEED  = 1.6
    const HIT_DIST      = 1.2
    const HIT_COOLDOWN  = 1000

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
        // Night: chase player anywhere (no wilderness boundary)
        if (dist > HIT_DIST) {
          z.x += (dx / dist) * ZOMBIE_SPEED * delta
          z.z += (dz / dist) * ZOMBIE_SPEED * delta
        }
      } else {
        // Day: stay dead (won't move)
        continue
      }

      // Update mesh directly
      const mesh = zombieMeshMap.current.get(z.id)
      if (mesh) {
        mesh.position.x = z.x
        mesh.position.z = z.z
        if (dist > 0.1) mesh.rotation.y = Math.atan2(dx, dz)
      }

      // Deal damage to player
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
      const PLOT_SPACING = 1.9
      const plotsToDestroy = []
      for (const z of zombiesRef.current) {
        if (z.hp <= 0) continue
        // Check if zombie is in farm area (z > WILD_BOUNDARY)
        if (z.z <= WILD_BOUNDARY) continue

        // Find plots near zombie
        for (let i = 0; i < plots.length; i++) {
          if (!plots[i]) continue  // Already empty
          const col = i % 5
          const row = Math.floor(i / 5)
          const totalRows = 5 + (profile?.extraRows || 0)
          const px = (col - 2) * PLOT_SPACING
          const pz = (row - (totalRows - 1) / 2) * PLOT_SPACING
          const d = Math.sqrt((z.x - px) ** 2 + (z.z - pz) ** 2)
          if (d < 1.5) {
            plotsToDestroy.push(i)
          }
        }
      }
      if (plotsToDestroy.length > 0) {
        onPlayerDamaged?.({ destroyPlots: plotsToDestroy })
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
        const r       = playerRot.current
        const isBow   = weaponRangeRef.current > 0
        const atkDist = isBow ? weaponRangeRef.current : PLOT_SPACING * 2
        const atkX    = px + Math.sin(r) * atkDist
        const atkZ    = pz + Math.cos(r) * atkDist
        let zombieHit = false
        for (const z of zombiesRef.current) {
          if (z.hp <= 0) continue
          const d = Math.sqrt((atkX - z.x) ** 2 + (atkZ - z.z) ** 2)
          if (d < (isBow ? PLOT_SPACING : PLOT_SPACING * 2)) {
            const wasAlive = z.hp > 0
            z.hp = Math.max(0, z.hp - (attackDmgRef.current || 1))
            hpUpdates[z.id] = z.hp
            hpChanged = true
            zombieHit = true
            // Killed a zombie — fire callback with kill reward
            if (wasAlive && z.hp <= 0) {
              onPlayerDamaged?.({ killed: true })
            }
            break
          }
        }
        if (!zombieHit) {
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

    if (hpChanged) setZombieHps(prev => ({ ...prev, ...hpUpdates }))

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
      <Fence totalRows={totalRows}/>
      <House3D onEnter={onHouseEnter} houseLevel={profile?.houseLevel || 0}/>
      <Wilderness/>
      <CastleCity/>

      {Array.from({length: totalRows * 5}).map((_,i) => (
        <GardenPlot key={i} index={i} plot={plots[i]??null} onPlotClick={handlePlotClick} totalRows={totalRows}/>
      ))}

      {isNight && zombiesRef.current.map(z => (
        <ZombieBody key={z.id} zombie={z} hp={zombieHps[z.id] ?? 10} meshMapRef={zombieMeshMap}/>
      ))}

      <PlayerCharacter playerRef={playerRef} outfit={outfit} swingRef={swingRef}/>
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function Garden3D({ plots, onPlotClick, profile, outfit, onNearHouse, onHouseEnter,
                                   dayPhase, onPlayerDamaged, onTalkToNpc, onNearNpc, onSleep, attackDamage, weaponRange, equipSource }) {
  return (
    <Canvas shadows camera={{position:[0,8,13],fov:55}} style={{width:'100%',height:'100%',display:'block'}}>
      <GameScene plots={plots} onPlotClick={onPlotClick} profile={profile}
        outfit={outfit} onNearHouse={onNearHouse} onHouseEnter={onHouseEnter}
        dayPhase={dayPhase} onPlayerDamaged={onPlayerDamaged} onTalkToNpc={onTalkToNpc}
        onNearNpc={onNearNpc} onSleep={onSleep} attackDamage={attackDamage} weaponRange={weaponRange} equipSource={equipSource}/>
    </Canvas>
  )
}
