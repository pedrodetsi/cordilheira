import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Seleção tolerante ao dedo. Um raio único (ponto exato do toque) erra com
// facilidade: os picos são finos e se sobrepõem, então um toque poucos pixels
// acima da ponta do pico da frente acerta o pico de trás. Aqui amostramos a
// área de contato (anéis em volta do ponto) para achar os picos visíveis sob
// o dedo e escolhemos aquele cujo eixo projetado na tela (base → ponta) passa
// mais perto do toque — é o pico para o qual a pessoa está apontando.
// ─────────────────────────────────────────────────────────────────────────────

const RINGS = [
  { r: 0, n: 1 },
  { r: 0.5, n: 6 },
  { r: 1, n: 10 },
]

export default function TapPicker({ onSelect }) {
  const { gl, camera, scene } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const v = new THREE.Vector3()
    let down = null

    const onDown = (e) => {
      if (e.isPrimary === false) return
      down = { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' }
    }
    const onUp = (e) => {
      if (!down || e.isPrimary === false) return
      const d = down
      down = null
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > (d.touch ? 10 : 6)) return // arrasto

      const peaks = []
      scene.traverse((o) => { if (o.isMesh && o.userData.run && o.userData.matched) peaks.push(o) })
      const rect = el.getBoundingClientRect()
      const tx = e.clientX - rect.left
      const ty = e.clientY - rect.top
      const R = d.touch ? 14 : 4

      // picos visíveis sob a área de contato
      const seen = new Set()
      for (const ring of RINGS) {
        for (let k = 0; k < ring.n; k++) {
          const a = (k / ring.n) * Math.PI * 2
          const px = tx + Math.cos(a) * ring.r * R
          const py = ty + Math.sin(a) * ring.r * R
          ndc.set((px / rect.width) * 2 - 1, -(py / rect.height) * 2 + 1)
          ray.setFromCamera(ndc, camera)
          const hit = ray.intersectObjects(peaks, false)[0]
          if (hit) seen.add(hit.object)
        }
      }
      if (!seen.size) { onSelect(null); return }

      // eixo projetado mais próximo do toque
      const toScreen = (x, y, z) => {
        v.set(x, y, z).project(camera)
        return [((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height]
      }
      let pick = null
      let best = Infinity
      for (const m of seen) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
        const top = m.geometry.boundingBox.max.y * m.scale.y
        const p = m.parent.position
        const [ax, ay] = toScreen(p.x, 0, p.z)
        const [bx, by] = toScreen(p.x, top, p.z)
        const vx = bx - ax, vy = by - ay
        const t = Math.max(0, Math.min(1, ((tx - ax) * vx + (ty - ay) * vy) / (vx * vx + vy * vy || 1)))
        const dist = Math.hypot(tx - (ax + vx * t), ty - (ay + vy * t))
        if (dist < best) { best = dist; pick = m }
      }
      onSelect(pick.userData.run)
    }
    const onCancel = () => { down = null }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [gl, camera, scene, onSelect])

  return null
}
