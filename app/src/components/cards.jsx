import { STATUS, refPhoto } from '../lib/supabase'
import { zoneOf } from '../lib/geometry'

/* ---------- tarjeta de lista (exterior) ---------- */
export function PlantCard({ p, profiles, zones, onOpen }) {
  const ph = refPhoto(p)
  const who = p.assigned_to && profiles[p.assigned_to] ? profiles[p.assigned_to].name : ''
  const zn = p.loc === 'exterior' ? ((zoneOf(p, zones) || {}).name || 'Exterior') : 'Invernadero'
  return (
    <div onClick={() => onOpen(p.id)}
      className="mb-2.5 flex cursor-pointer items-center gap-3 rounded-2xl border border-hairline bg-surface p-2.5 shadow-card transition active:scale-[0.99]">
      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-[#e9e4d6] bg-cover bg-center text-xl"
        style={ph ? { backgroundImage: `url(${ph})` } : undefined}>
        {ph ? '' : '🌿'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-soil">{p.id} · {zn}{who ? ` · 🙋 ${who}` : ''}</div>
        <div className="truncate text-[15px] font-bold">{p.name || 'Sin nombre'}</div>
        <div className="truncate text-xs text-soil">{p.problem || STATUS[p.status].l}</div>
      </div>
      <div className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: STATUS[p.status].c }} />
    </div>
  )
}

/* ---------- tarjeta grande de galería (interior) ---------- */
export function PlantCardBig({ p, onOpen }) {
  const ph = refPhoto(p)
  return (
    <div onClick={() => onOpen(p.id)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card transition active:scale-[0.99]">
      <div className="relative flex aspect-square w-full items-center justify-center bg-[#e9e4d6] bg-cover bg-center text-3xl"
        style={ph ? { backgroundImage: `url(${ph})` } : undefined}>
        {ph ? '' : '🌿'}
        <span className="absolute left-2 top-2 rounded-lg bg-black/55 px-2 py-0.5 text-[13px] font-extrabold text-white">{p.id}</span>
        <span className="absolute right-2 top-2 h-[15px] w-[15px] rounded-full border-2 border-white shadow"
          style={{ background: STATUS[p.status].c }} />
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="text-[13.5px] font-bold leading-tight">{p.name || 'Sin nombre'}</div>
        <div className="mt-0.5 truncate text-[11px] italic text-soil">{p.species || ''}</div>
      </div>
    </div>
  )
}
