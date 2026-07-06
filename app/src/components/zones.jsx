import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, Plus, StickyNote, Camera, X } from 'lucide-react'
import { sb, esErr, fmtWhen } from '../lib/supabase'
import { zoneOf } from '../lib/geometry'
import { fileToResizedDataURL, dataURLtoBlob } from '../lib/img'
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
export function ZoneNotes({ zone, me, profiles, onShowPhoto }) {
  const [notes, setNotes] = useState(null)
  const [text, setText] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { load() }, [zone.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      const { data, error } = await sb.from('zone_entries').select('*')
        .eq('zone_id', zone.id).order('created_at', { ascending: false })
      if (error) throw error
      setNotes(data || []); setErr(false)
    } catch { setNotes([]); setErr(true) }
  }

  async function onPhotoPicked(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    try { setPendingPhoto(await fileToResizedDataURL(f)) }
    catch (er) { alert(esErr(er)) }
  }

  async function add() {
    const t = text.trim()
    if (!t && !pendingPhoto) return
    setSaving(true)
    let photo_url = null
    try {
      if (pendingPhoto) {
        const blob = dataURLtoBlob(pendingPhoto)
        const path = 'zona/' + zone.id + '/' + Date.now() + '.jpg'
        const { error: upErr } = await sb.storage.from('plant-photos')
          .upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
        photo_url = sb.storage.from('plant-photos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await sb.from('zone_entries')
        .insert({ zone_id: zone.id, author: me.id, text: t || null, photo_url })
      if (error) throw error
      setText(''); setPendingPhoto(null); load()
    } catch (e) { alert('No se pudo guardar la nota de zona: ' + esErr(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide text-brand">
        <StickyNote size={14} aria-hidden="true" /> Notas de la zona: {zone.name}
      </div>
      <Hint className="mb-2.5">Comentario general de la zona (no de una planta). Puedes adjuntar una foto para explicar mejor. Ej: "estos maceteros están deteriorados".</Hint>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Escribe una nota de esta zona…" className="mb-2" />

      {pendingPhoto && (
        <div className="relative mb-2">
          <img src={pendingPhoto} alt="Foto de la nota"
            className="w-full rounded-xl border border-hairline" />
          <button onClick={() => setPendingPhoto(null)} aria-label="Quitar foto"
            className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/60 text-white">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={onPhotoPicked} />
      <button onClick={() => fileRef.current?.click()}
        className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-accent/60 bg-surface py-3 text-[15px] font-bold text-accent">
        <Camera size={18} aria-hidden="true" /> {pendingPhoto ? 'Cambiar foto' : 'Agregar foto (opcional)'}
      </button>
      <button onClick={add} disabled={saving}
        className="w-full cursor-pointer rounded-xl border-none bg-brand py-3.5 text-[15px] font-bold text-white disabled:opacity-70">
        {saving ? 'Guardando…' : 'Guardar nota de zona'}
      </button>

      <div className="mt-3">
        {notes === null && <div className="text-sm text-soil">Cargando…</div>}
        {err && <Hint>No se pudieron cargar las notas de zona.</Hint>}
        {notes !== null && !err && notes.length === 0 && <Hint>Sin notas de zona todavía.</Hint>}
        {(notes || []).map(n => (
          <div key={n.id} className="mb-2 rounded-xl border border-hairline bg-surface px-3 py-2.5">
            <div className="text-[11px] font-bold text-soil">{fmtWhen(n.created_at)}</div>
            {n.text && <div className="my-1 text-sm">{n.text}</div>}
            {n.photo_url && (
              <img src={n.photo_url} loading="lazy" alt="Foto de la nota"
                className="mt-1.5 w-full cursor-pointer rounded-lg"
                onClick={() => onShowPhoto && onShowPhoto(n.photo_url)} />
            )}
            <div className="mt-1 text-[11px] font-semibold text-brand2">
              — {profiles[n.author] ? profiles[n.author].name : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
