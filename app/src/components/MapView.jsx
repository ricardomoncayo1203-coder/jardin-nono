import { useEffect, useRef, useCallback } from 'react'
import { MAP_URL, STATUS } from '../lib/supabase'
import { centroid, zoneOf, zoneBBox } from '../lib/geometry'

/*
 * Mapa satelital con zoom/paneo/pellizco + pines de tamaño constante.
 * La matemática está portada tal cual del app clásico (probada en campo):
 *  - transform: translate(tx,ty) scale(s) sobre .mapinner, origin 0 0
 *  - --pinScale = 1/s para que pines y etiquetas no crezcan al acercar
 *  - supresión del click fantasma tras un gesto (captura en mapwrap)
 */
export default function MapView({
  plants, settings, zoneFocus, placing, modeText,
  onOpenPlant, onOpenZone, onGoInterior, onPlace,
}) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const stRef = useRef({ scale: 1, tx: 0, ty: 0, moved: false })

  const apply = useCallback(() => {
    const inner = innerRef.current
    if (!inner) return
    const s = stRef.current
    inner.style.transform = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`
    inner.style.setProperty('--pinScale', (1 / s.scale).toFixed(4))
  }, [])

  const clampPan = useCallback(() => {
    const w = wrapRef.current
    if (!w) return
    const s = stRef.current
    const W = w.clientWidth, H = w.clientHeight
    const minX = W - W * s.scale, minY = H - H * s.scale
    s.tx = Math.max(minX, Math.min(0, s.tx))
    s.ty = Math.max(minY, Math.min(0, s.ty))
  }, [])

  const zoomAt = useCallback((px, py, ns) => {
    const s = stRef.current
    ns = Math.max(1, Math.min(4, ns))
    const cx = (px - s.tx) / s.scale, cy = (py - s.ty) / s.scale
    s.scale = ns
    s.tx = px - cx * ns
    s.ty = py - cy * ns
    clampPan(); apply()
  }, [apply, clampPan])

  const zoomBtn = dir => {
    const w = wrapRef.current
    if (!w) return
    zoomAt(w.clientWidth / 2, w.clientHeight / 2, stRef.current.scale * (dir > 0 ? 1.6 : 1 / 1.6))
  }
  const zoomReset = useCallback(() => {
    stRef.current.scale = 1; stRef.current.tx = 0; stRef.current.ty = 0; apply()
  }, [apply])

  /* gestos: pellizco + paneo + supresión de click fantasma */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const st = stRef.current
    const pts = new Map()
    let startDist = 0, startScale = 1, panLast = null, downXY = null
    const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    const M = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

    const down = e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 1) {
        panLast = { x: e.clientX, y: e.clientY }
        downXY = { x: e.clientX, y: e.clientY }
        st.moved = false
      } else if (pts.size === 2) {
        const p = [...pts.values()]
        startDist = D(p[0], p[1]); startScale = st.scale
      }
    }
    const move = e => {
      if (!pts.has(e.pointerId)) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const p = [...pts.values()]
      if (p.length >= 2) {
        const d = D(p[0], p[1])
        if (startDist > 0) {
          const m = M(p[0], p[1])
          const rc = wrap.getBoundingClientRect()
          zoomAt(m.x - rc.left, m.y - rc.top, startScale * (d / startDist))
        }
        st.moved = true
        e.preventDefault()
      } else if (panLast) {
        if (downXY && (Math.abs(e.clientX - downXY.x) + Math.abs(e.clientY - downXY.y)) > 8) st.moved = true
        if (st.scale > 1) {
          st.tx += e.clientX - panLast.x
          st.ty += e.clientY - panLast.y
          clampPan(); apply()
        }
        panLast = { x: e.clientX, y: e.clientY }
      }
    }
    const up = e => {
      pts.delete(e.pointerId)
      if (pts.size < 2) startDist = 0
      if (pts.size === 0) panLast = null
    }
    const clickCap = e => {
      if (st.moved) { e.stopPropagation(); e.preventDefault(); st.moved = false }
    }

    wrap.addEventListener('pointerdown', down)
    wrap.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    wrap.addEventListener('click', clickCap, true)
    return () => {
      wrap.removeEventListener('pointerdown', down)
      wrap.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      wrap.removeEventListener('click', clickCap, true)
    }
  }, [apply, clampPan, zoomAt])

  /* enfocar zona seleccionada (o resetear al salir).
     Depende SOLO de zoneFocus: guardar/renombrar zonas no debe mover la cámara
     (igual que el app clásico, que conservaba el zoom tras "✔ Listo"). */
  const zonesRef = useRef(settings.zones)
  zonesRef.current = settings.zones
  useEffect(() => {
    if (!zoneFocus) { zoomReset(); return }
    const z = (zonesRef.current || []).find(x => x.id === zoneFocus)
    if (!z || !z.points || z.points.length < 3) return
    const wrap = wrapRef.current
    if (!wrap) return
    const W = wrap.clientWidth, H = wrap.clientHeight
    const b = zoneBBox(z)
    const bw = Math.max(2, (b.maxX - b.minX)) / 100, bh = Math.max(2, (b.maxY - b.minY)) / 100
    let sc = Math.min(1 / (bw * 1.35), 1 / (bh * 1.35))
    sc = Math.max(1, Math.min(4, sc))
    const s = stRef.current
    s.scale = sc
    const cx = ((b.minX + b.maxX) / 2) / 100 * W, cy = ((b.minY + b.maxY) / 2) / 100 * H
    s.tx = W / 2 - cx * sc
    s.ty = H / 2 - cy * sc
    clampPan(); apply()
  }, [zoneFocus, apply, clampPan, zoomReset])

  function mapXY(e) {
    const rc = innerRef.current.getBoundingClientRect()
    return { x: (e.clientX - rc.left) / rc.width * 100, y: (e.clientY - rc.top) / rc.height * 100 }
  }

  function handleMapClick(e) {
    if (placing) onPlace(mapXY(e))
  }

  const zones = (settings.zones || []).filter(z => z.points && z.points.length >= 3)
  const visibleZones = zoneFocus ? zones.filter(z => z.id === zoneFocus) : zones
  const draft = placing && placing.mode === 'draw' ? placing : null
  const draftColor = draft
    ? ((settings.zones || []).find(z => z.id === draft.zoneId) || {}).color || '#333'
    : null
  const housePin = settings.house_pin || { x: 67, y: 61 }

  const pins = plants.filter(p => {
    if (p.loc !== 'exterior' || p.x == null || p.y == null) return false
    if (zoneFocus && (zoneOf(p, settings.zones) || {}).id !== zoneFocus) return false
    return true
  })

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold"
          style={{ background: placing ? '#ffe9a8' : '#eee' }}>
          {modeText}
        </span>
      </div>
      <div ref={wrapRef} onClick={handleMapClick}
        className={`mapwrap ${placing ? 'drawing' : ''}`}>
        <div ref={innerRef} className="mapinner">
          <img src={MAP_URL} alt="Mapa del jardín de Nono" draggable={false} />
          <svg className="zone-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {visibleZones.map(z => (
              <polygon key={z.id} data-tap="1"
                points={z.points.map(pt => pt[0] + ',' + pt[1]).join(' ')}
                fill={z.color} fillOpacity=".18"
                stroke={z.color} strokeWidth="2" strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'pointer' }}
                onClick={e => {
                  if (placing) return /* deja pasar el toque al mapa */
                  e.stopPropagation()
                  onOpenZone(z.id)
                }}
              />
            ))}
            {draft && draft.points.length >= 3 && (
              <polygon points={draft.points.map(pt => pt[0] + ',' + pt[1]).join(' ')}
                fill={draftColor} fillOpacity=".28" stroke="none" />
            )}
            {draft && draft.points.length >= 2 && (
              <polyline points={draft.points.map(pt => pt[0] + ',' + pt[1]).join(' ')}
                fill="none" stroke={draftColor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            )}
            {draft && draft.points.map((pt, i) => (
              <circle key={i} cx={pt[0]} cy={pt[1]} r="1.1"
                fill="#fff" stroke={draftColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0">
            {visibleZones.map(z => {
              const c = centroid(z.points)
              return (
                <div key={z.id} className="zlabel"
                  style={{ left: c[0] + '%', top: c[1] + '%', borderColor: z.color, color: z.color }}>
                  {z.name}
                </div>
              )
            })}
          </div>
          {pins.map(p => (
            <div key={p.id} className="pin" style={{ left: p.x + '%', top: p.y + '%' }}
              onClick={e => { e.stopPropagation(); onOpenPlant(p.id) }}>
              <b style={{ background: STATUS[p.status].c }}><span>{String(p.id).replace('#', '')}</span></b>
            </div>
          ))}
          {!zoneFocus && (
            <div className="pin house" title="Plantas de interior"
              style={{ left: housePin.x + '%', top: housePin.y + '%' }}
              onClick={e => { e.stopPropagation(); onGoInterior() }}>
              <b style={{ background: '#6b7561' }}><span>🏠</span></b>
            </div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1.5">
          {[['＋', () => zoomBtn(1), 'Acercar'], ['－', () => zoomBtn(-1), 'Alejar'], ['⟲', zoomReset, 'Restablecer zoom']].map(([t, fn, label]) => (
            <button key={label} type="button" aria-label={label}
              onClick={e => { e.stopPropagation(); fn() }}
              className="h-10 w-10 cursor-pointer rounded-xl border border-hairline bg-white/95 p-0 text-xl font-extrabold leading-none text-brand shadow-md">
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
