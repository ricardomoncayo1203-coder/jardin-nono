import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, StickyNote } from 'lucide-react'
import { sb, esErr, fmtWhen } from '../lib/supabase'
import { zoneOf } from '../lib/geometry'
import { PlantCard } from './cards'
import { Hint } from './ui'

/* ---------- hoja de una zona: plantas + acciones admin ---------- */
export function ZoneSheet({ zone, plants, profiles, settings, isAdmin, onOpenPlant, onRename, onRedraw, onDelete }) {
  const members = plants.filter(p => p.loc === 'exterior' && (zoneOf(p, settings.zones) || {}).id === zone.id)
  return (
    <div>
      {isAdmin && (
        <div className="mb-3 flex flex-col gap-2">
          <button onClick={onRename}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-surface py-3 text-[15px] font-bold">
            <Pencil size={16} aria-hidden="true" /> Renombrar</button>
          <button onClick={onRedraw}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-surface py-3 text-[15px] font-bold">
            <Pencil size={16} aria-hidden="true" /> Redibujar límites</button>
          <button onClick={onDelete}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-rojo bg-white py-3 text-[15px] font-bold text-rojo">
            <Trash2 size={16} aria-hidden="true" /> Eliminar zona</button>
        </div>
      )}
      {!members.length && <Hint className="mb-2">No hay pines de plantas dentro de esta zona todavía.</Hint>}
      {members.map(p => (
        <PlantCard key={p.id} p={p} profiles={profiles} zones={settings.zones} onOpen={onOpenPlant} />
      ))}
    </div>
  )
}

/* ---------- gestor de zonas (admin) ---------- */
export function ZoneManager({ settings, onNew, onDraw }) {
  return (
    <div>
      <Hint className="mb-3">Crea una zona, ponle nombre y dibuja sus límites tocando las esquinas del área en el mapa.</Hint>
      {(settings.zones || []).map(z => (
        <div key={z.id} className="mb-2.5 flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-2.5">
          <div className="h-[18px] w-[18px] flex-none rounded-full" style={{ background: z.color }} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">{z.name}</div>
            <div className="text-xs text-soil">
              {z.points && z.points.length >= 3 ? z.points.length + ' puntos' : 'sin límites dibujados'}
            </div>
          </div>
          <button onClick={() => onDraw(z.id)} aria-label={`Dibujar límites de ${z.name}`}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-brand text-white">
            <Pencil size={16} aria-hidden="true" /></button>
        </div>
      ))}
      <button onClick={onNew}
        className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-brand py-3.5 text-[15px] font-bold text-white">
        <Plus size={17} aria-hidden="true" /> Nueva zona
      </button>
    </div>
  )
}

/* ---------- notas de zona (comentario general, no por planta) ---------- */
export function ZoneNotes({ zone, me, profiles }) {
  const [notes, setNotes] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => { load() }, [zone.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      const { data, error } = await sb.from('zone_entries').select('*')
        .eq('zone_id', zone.id).order('created_at', { ascending: false })
      if (error) throw error
      setNotes(data || []); setErr(false)
    } catch { setNotes([]); setErr(true) }
  }

  async function add() {
    const t = text.trim()
    if (!t) return
    try {
      const { error } = await sb.from('zone_entries').insert({ zone_id: zone.id, author: me.id, text: t })
      if (error) throw error
      setText(''); load()
    } catch (e) { alert('No se pudo guardar la nota de zona: ' + esErr(e)) }
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide text-brand">
        <StickyNote size={14} aria-hidden="true" /> Notas de la zona: {zone.name}
      </div>
      <Hint className="mb-2.5">Comentario general de la zona (no de una planta). Ej: "todo el borde necesita tierra negra".</Hint>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Escribe una nota de esta zona…" className="mb-2" />
      <button onClick={add}
        className="w-full cursor-pointer rounded-xl border-none bg-brand py-3.5 text-[15px] font-bold text-white">
        Guardar nota de zona
      </button>
      <div className="mt-3">
        {notes === null && <div className="text-sm text-soil">Cargando…</div>}
        {err && <Hint>No se pudieron cargar las notas de zona.</Hint>}
        {notes !== null && !err && notes.length === 0 && <Hint>Sin notas de zona todavía.</Hint>}
        {(notes || []).map(n => (
          <div key={n.id} className="mb-2 rounded-xl border border-hairline bg-surface px-3 py-2.5">
            <div className="text-[11px] font-bold text-soil">{fmtWhen(n.created_at)}</div>
            <div className="my-1 text-sm">{n.text}</div>
            <div className="text-[11px] font-semibold text-brand2">
              — {profiles[n.author] ? profiles[n.author].name : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
