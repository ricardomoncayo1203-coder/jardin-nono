import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Share2, Camera, ClipboardList,
  Flower2, AlertTriangle, StickyNote, Check,
} from 'lucide-react'
import { sb, STATUS } from '../lib/supabase'
import { zoneOf } from '../lib/geometry'
import { Dot, Hint } from './ui'

/* Reporte mensual para la familia (pedido de la reunión del 3-jul):
   resume la actividad del mes y se comparte por WhatsApp con un toque. */

const ORD = { rojo: 0, amarillo: 1, verde: 2 }

function monthLabel(y, m) {
  const s = new Date(y, m, 1).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Reporte({ plants, profiles, settings, onShowPhoto }) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [entries, setEntries] = useState(null)
  const [znotes, setZnotes] = useState([])
  const [err, setErr] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [e, z] = await Promise.all([
          sb.from('entries').select('*').order('created_at'),
          sb.from('zone_entries').select('*').order('created_at'),
        ])
        if (e.error) throw e.error
        setEntries(e.data || [])
        setZnotes(z.error ? [] : (z.data || []))
        setErr(false)
      } catch { setEntries([]); setErr(true) }
    })()
  }, [])

  const isCurrentMonth = ym.y === now.getFullYear() && ym.m === now.getMonth()
  const prevMonth = () => setYm(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
  const nextMonth = () => { if (!isCurrentMonth) setYm(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }) }

  const R = useMemo(() => {
    if (!entries) return null
    const inMonth = ts => { const d = new Date(ts); return d.getFullYear() === ym.y && d.getMonth() === ym.m }
    const es = entries.filter(l => inMonth(l.created_at))
    const zs = znotes.filter(n => inMonth(n.created_at))

    const fotos = es.filter(l => l.photo_url).length
    const atendidas = [...new Set(es.map(l => l.plant_id))]
    const autores = [...new Set(es.map(l => l.author))]
      .map(id => profiles[id]?.name).filter(Boolean)

    /* mejoras/empeoramientos: primer vs último estado del mes por planta */
    let mejoraron = 0, empeoraron = 0
    atendidas.forEach(pid => {
      const seq = es.filter(l => l.plant_id === pid && l.status)
      if (seq.length >= 2) {
        const d = ORD[seq[seq.length - 1].status] - ORD[seq[0].status]
        if (d > 0) mejoraron++
        if (d < 0) empeoraron++
      }
    })

    /* actividad por zona (plantas de exterior) */
    const porZona = {}
    es.forEach(l => {
      const p = plants.find(x => x.id === l.plant_id)
      if (!p) return
      const zn = p.loc === 'exterior' ? ((zoneOf(p, settings.zones) || {}).name || 'Exterior (sin zona)') : 'Interior'
      porZona[zn] = (porZona[zn] || 0) + 1
    })

    /* estado actual del jardín */
    let v = 0, a = 0, r = 0
    plants.forEach(p => { p.status === 'verde' ? v++ : p.status === 'amarillo' ? a++ : r++ })
    const urgentes = plants.filter(p => p.status === 'rojo')

    return { es, zs, fotos, atendidas, autores, mejoraron, empeoraron, porZona, v, a, r, urgentes }
  }, [entries, znotes, ym, plants, profiles, settings.zones])

  function shareText() {
    const L = []
    L.push(`🌿 Jardín de Nono — Reporte ${monthLabel(ym.y, ym.m)}`)
    L.push('')
    L.push(`Estado del jardín: ${R.v} sanas · ${R.a} en observación · ${R.r} urgentes (${plants.length} plantas)`)
    L.push(`Actividad del mes: ${R.es.length} registros · ${R.fotos} fotos · ${R.atendidas.length} plantas atendidas`)
    if (R.autores.length) L.push(`Equipo: ${R.autores.join(', ')}`)
    if (R.mejoraron || R.empeoraron) L.push(`Evolución: ${R.mejoraron} mejoraron · ${R.empeoraron} empeoraron`)
    const zonas = Object.entries(R.porZona).sort((x, y2) => y2[1] - x[1])
    if (zonas.length) {
      L.push('')
      L.push('Actividad por zona:')
      zonas.forEach(([zn, n]) => L.push(`• ${zn}: ${n} registro${n === 1 ? '' : 's'}`))
    }
    if (R.zs.length) {
      L.push('')
      L.push('Notas de zona:')
      R.zs.slice(-3).forEach(n => {
        const zn = (settings.zones || []).find(z => z.id === n.zone_id)
        L.push(`• ${zn ? zn.name + ': ' : ''}${n.text || ''}${n.photo_url ? ' (con foto)' : ''}`)
      })
    }
    if (R.urgentes.length) {
      L.push('')
      L.push('⚠️ Requieren atención:')
      R.urgentes.forEach(p => L.push(`• ${p.id} ${p.name || ''}`))
    }
    L.push('')
    L.push('App: https://ricardomoncayo1203-coder.github.io/jardin-nono/')
    return L.join('\n')
  }

  async function share() {
    const text = shareText()
    try {
      if (navigator.share) { await navigator.share({ text }) }
      else { await navigator.clipboard.writeText(text) }
      setShared(true); setTimeout(() => setShared(false), 2500)
    } catch { /* usuario canceló el diálogo de compartir */ }
  }

  const stat = (Icon, n, label) => (
    <div className="flex-1 rounded-2xl border border-hairline bg-surface px-2 py-3 text-center shadow-card">
      <Icon size={18} className="mx-auto mb-1 text-brand2" aria-hidden="true" />
      <div className="text-[20px] font-extrabold leading-none tabular-nums">{n}</div>
      <div className="mt-1 text-[11px] text-soil">{label}</div>
    </div>
  )

  if (!R) return <div className="py-8 text-center text-sm text-soil">Cargando el reporte…</div>

  return (
    <div className="anim-fade">
      {/* selector de mes */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-hairline bg-surface px-2 py-1.5 shadow-card">
        <button onClick={prevMonth} aria-label="Mes anterior"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-brand">
          <ChevronLeft size={20} />
        </button>
        <div className="font-display text-[16px] font-semibold">{monthLabel(ym.y, ym.m)}</div>
        <button onClick={nextMonth} aria-label="Mes siguiente" disabled={isCurrentMonth}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-brand disabled:opacity-30">
          <ChevronRight size={20} />
        </button>
      </div>

      {err && <Hint className="mb-3">No se pudo cargar la actividad. Revisa tu conexión.</Hint>}

      {/* estado actual */}
      <div className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-brand">Estado del jardín hoy</div>
      <div className="mb-4 flex gap-2">
        <div className="flex-1 rounded-2xl border border-hairline bg-surface px-2 py-3 text-center shadow-card">
          <div className="text-[20px] font-extrabold leading-none"><Dot status="verde" size={13} /> {R.v}</div>
          <div className="mt-1 text-[11px] text-soil">Sanas</div>
        </div>
        <div className="flex-1 rounded-2xl border border-hairline bg-surface px-2 py-3 text-center shadow-card">
          <div className="text-[20px] font-extrabold leading-none"><Dot status="amarillo" size={13} /> {R.a}</div>
          <div className="mt-1 text-[11px] text-soil">Observación</div>
        </div>
        <div className="flex-1 rounded-2xl border border-hairline bg-surface px-2 py-3 text-center shadow-card">
          <div className="text-[20px] font-extrabold leading-none"><Dot status="rojo" size={13} /> {R.r}</div>
          <div className="mt-1 text-[11px] text-soil">Urgentes</div>
        </div>
      </div>

      {/* actividad del mes */}
      <div className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-brand">Actividad del mes</div>
      <div className="mb-3 flex gap-2">
        {stat(ClipboardList, R.es.length, 'Registros')}
        {stat(Camera, R.fotos, 'Fotos')}
        {stat(Flower2, R.atendidas.length, 'Atendidas')}
      </div>
      {R.autores.length > 0 && (
        <div className="mb-3 rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm">
          <span className="font-bold">Equipo activo:</span> {R.autores.join(', ')}
          {(R.mejoraron > 0 || R.empeoraron > 0) && (
            <div className="mt-1 text-xs text-soil">{R.mejoraron} plantas mejoraron · {R.empeoraron} empeoraron</div>
          )}
        </div>
      )}
      {R.es.length === 0 && !err && (
        <Hint className="mb-3">Sin actividad registrada en {monthLabel(ym.y, ym.m)}.</Hint>
      )}

      {/* por zona */}
      {Object.keys(R.porZona).length > 0 && (
        <>
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-brand">Por zona</div>
          <div className="mb-3 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
            {Object.entries(R.porZona).sort((a2, b2) => b2[1] - a2[1]).map(([zn, n], i, arr) => (
              <div key={zn} className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${i < arr.length - 1 ? 'border-b border-hairline' : ''}`}>
                <span className="font-semibold">{zn}</span>
                <span className="tabular-nums text-soil">{n} registro{n === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* notas de zona del mes */}
      {R.zs.length > 0 && (
        <>
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-brand">Notas de zona</div>
          {R.zs.slice(-5).reverse().map(n => {
            const zn = (settings.zones || []).find(z => z.id === n.zone_id)
            return (
              <div key={n.id} className="mb-2 flex gap-2.5 rounded-xl border border-hairline bg-surface px-3 py-2.5">
                <StickyNote size={15} className="mt-0.5 flex-none text-brand2" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm">
                  {zn && <span className="font-bold">{zn.name}: </span>}{n.text}
                  {n.photo_url && (
                    <img src={n.photo_url} loading="lazy" alt="Foto de la nota"
                      className="mt-1.5 max-h-40 cursor-pointer rounded-lg"
                      onClick={() => onShowPhoto && onShowPhoto(n.photo_url)} />
                  )}
                  <div className="mt-0.5 text-[11px] text-soil">— {profiles[n.author]?.name || '—'}</div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* urgentes */}
      {R.urgentes.length > 0 && (
        <>
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-rojo">Requieren atención</div>
          <div className="mb-3 overflow-hidden rounded-2xl border border-rojo/40 bg-surface shadow-card">
            {R.urgentes.map((p, i, arr) => (
              <div key={p.id} className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm ${i < arr.length - 1 ? 'border-b border-hairline' : ''}`}>
                <AlertTriangle size={15} className="flex-none text-rojo" aria-hidden="true" />
                <span className="font-bold">{p.id}</span>
                <span className="truncate">{p.name || 'Sin nombre'}</span>
                <span className="ml-auto truncate text-[11px] text-soil">{STATUS[p.status].l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* compartir */}
      <button onClick={share}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-accent py-3.5 text-[15px] font-bold text-white shadow-card">
        {shared ? <><Check size={18} aria-hidden="true" /> ¡Listo!</> : <><Share2 size={18} aria-hidden="true" /> Compartir con la familia</>}
      </button>
      <div className="mt-2 text-center text-[11px] text-soil">
        Se abre el menú de compartir (WhatsApp, correo…). Si no está disponible, se copia el texto.
      </div>
    </div>
  )
}
