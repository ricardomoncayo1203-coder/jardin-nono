import { useEffect, useRef, useState } from 'react'
import { sb, esErr, STATUS, refPhoto, fmtWhen } from '../lib/supabase'
import { zoneOf } from '../lib/geometry'
import { fileToResizedDataURL, dataURLtoBlob } from '../lib/img'
import { Hint } from './ui'

/* Expediente de la planta: ficha tipo dossier + nuevo registro + bitácora */
export default function PlantSheet({
  plant: p, me, isAdmin, profiles, zones,
  onReload, onShowPhoto, onPlacePin,
}) {
  const [entries, setEntries] = useState(null)     /* null = cargando */
  const [entriesErr, setEntriesErr] = useState(false)
  const [entryStatus, setEntryStatus] = useState(p.status)
  const [text, setText] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState(p.actions || '')
  const fileRef = useRef(null)

  useEffect(() => {
    setEntryStatus(p.status)
    setPlan(p.actions || '')
  }, [p.id, p.status, p.actions])

  useEffect(() => { loadEntries() }, [p.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEntries() {
    const { data, error } = await sb.from('entries').select('*')
      .eq('plant_id', p.id).order('created_at', { ascending: false })
    setEntriesErr(!!error)
    setEntries(error ? [] : (data || []))
  }

  async function onPhotoPicked(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    try { setPendingPhoto(await fileToResizedDataURL(f)) }
    catch (err) { alert(esErr(err)) }
  }

  async function submitEntry() {
    const t = text.trim()
    if (!t && !pendingPhoto && entryStatus === p.status) {
      alert('Escribe un comentario, toma una foto o cambia el estado.')
      return
    }
    setSaving(true)
    let photo_url = null
    try {
      if (pendingPhoto) {
        const blob = dataURLtoBlob(pendingPhoto)
        const path = String(p.id).replace('#', 'N') + '/' + Date.now() + '.jpg'
        const { error: upErr } = await sb.storage.from('plant-photos')
          .upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
        photo_url = sb.storage.from('plant-photos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await sb.from('entries').insert({
        plant_id: p.id, author: me.id, text: t || null, status: entryStatus, photo_url,
      })
      if (error) throw error
      setPendingPhoto(null); setText('')
      await onReload()          /* el trigger actualiza el estado de la planta */
      await loadEntries()
    } catch (e2) { alert('No se pudo guardar: ' + esErr(e2)) }
    finally { setSaving(false) }
  }

  async function assignPlant(uid) {
    const { error } = await sb.from('plants').update({ assigned_to: uid || null }).eq('id', p.id)
    if (error) { alert('No se pudo asignar: ' + esErr(error)); return }
    await onReload()
  }

  async function savePlan() {
    const { error } = await sb.from('plants').update({ actions: plan }).eq('id', p.id)
    if (error) { alert('No se pudo guardar el plan: ' + esErr(error)); return }
    await onReload()
    alert('Plan actualizado.')
  }

  const ph = refPhoto(p)
  const zname = p.loc === 'exterior' ? ((zoneOf(p, zones) || {}).name || 'Exterior') : 'Invernadero'
  const who = p.assigned_to && profiles[p.assigned_to] ? profiles[p.assigned_to].name : ''
  const gardeners = Object.values(profiles).filter(x => x.role === 'gardener')
  const stc = STATUS[p.status].c

  const semBtn = (s, label) => (
    <button key={s} onClick={() => setEntryStatus(s)}
      className="flex-1 cursor-pointer rounded-xl border-2 bg-white px-1 py-2.5 text-[13px] font-bold transition"
      style={entryStatus === s
        ? { borderColor: STATUS[s].c, background: STATUS[s].c + '1a' }
        : { borderColor: 'var(--color-hairline)' }}>
      {label}
    </button>
  )

  const roField = (label, val) => (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-bold text-soil">{label}</label>
      <div className="whitespace-pre-wrap rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm">{val || '—'}</div>
    </div>
  )

  return (
    <div>
      {/* dossier */}
      <div className="mb-4 flex items-start gap-3">
        <div
          className="relative flex h-[116px] w-[116px] flex-none cursor-pointer items-center justify-center rounded-xl border border-hairline bg-[#e9e4d6] bg-cover bg-center text-3xl"
          style={ph ? { backgroundImage: `url(${ph})` } : undefined}
          onClick={() => ph && onShowPhoto(ph)}
          role="button" aria-label="Ampliar foto">
          {ph
            ? <span className="absolute bottom-1 right-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[10.5px] font-bold text-white">Ampliar</span>
            : '🌿'}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="font-display text-[18px] font-semibold leading-tight">{p.name || 'Sin nombre'}</div>
          <div className="text-[13px] italic leading-snug text-soil">{p.species || '—'}</div>
          <div className="self-start rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-extrabold"
            style={{ color: stc, borderColor: stc, background: stc + '1a' }}>
            {STATUS[p.status].l}
          </div>
          <div className="text-xs text-soil">📍 {zname}{who ? ` · 🙋 ${who}` : ''}</div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-soil">Responsable</label>
          <select value={p.assigned_to || ''} onChange={e => assignPlant(e.target.value)}>
            <option value="">— sin asignar —</option>
            {gardeners.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {roField('Problema', p.problem)}
      {roField('Diagnóstico', p.diagnosis)}

      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-soil">
          Plan — qué hacer{isAdmin ? ' (editable)' : ''}
        </label>
        {isAdmin ? (
          <>
            <textarea value={plan} onChange={e => setPlan(e.target.value)} />
            <button onClick={savePlan}
              className="mt-1.5 w-full cursor-pointer rounded-xl border border-hairline bg-surface py-3 text-[15px] font-bold">
              Guardar plan
            </button>
          </>
        ) : (
          <div className="whitespace-pre-wrap rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm">{p.actions || '—'}</div>
        )}
      </div>

      {isAdmin && p.loc === 'exterior' && (
        <button onClick={() => onPlacePin(p.id)}
          className="mb-2 w-full cursor-pointer rounded-xl border border-hairline bg-surface py-3 text-[15px] font-bold">
          📍 Colocar/mover en el mapa
        </button>
      )}

      {/* nuevo registro */}
      <div className="mb-2 mt-4 text-[13px] font-extrabold uppercase tracking-wide text-brand">Nuevo registro</div>
      <Hint>Toma una foto, escribe qué ves o qué hiciste, marca el estado y guarda. Todo queda en el registro.</Hint>

      <div className="mb-3 mt-3">
        <label className="mb-1 block text-xs font-bold text-soil">Estado ahora</label>
        <div className="flex gap-2">
          {semBtn('verde', '🟢 Sana')}
          {semBtn('amarillo', '🟡 Observar')}
          {semBtn('rojo', '🔴 Urgente')}
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-soil">Comentario</label>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Ej: podé las ramas secas / apareció hongo en la hoja" />
      </div>

      {pendingPhoto && (
        <div className="mb-3 aspect-[4/3] w-full rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${pendingPhoto})` }} />
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={onPhotoPicked} />
      <button onClick={() => fileRef.current?.click()}
        className="mb-2 w-full cursor-pointer rounded-xl border border-hairline bg-surface py-3 text-[15px] font-bold">
        📷 Tomar / elegir foto
      </button>
      <button onClick={submitEntry} disabled={saving}
        className="w-full cursor-pointer rounded-xl border-none bg-brand py-3.5 text-[15px] font-bold text-white disabled:opacity-70">
        {saving ? 'Guardando…' : 'Guardar registro'}
      </button>

      {/* bitácora */}
      <div className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-wide text-brand">Bitácora</div>
      {entries === null && <div className="text-sm text-soil">Cargando…</div>}
      {entriesErr && <Hint>No se pudo cargar la bitácora.</Hint>}
      {entries !== null && !entriesErr && entries.length === 0 && <Hint>Sin registros todavía.</Hint>}
      {entries !== null && entries.map(l => (
        <div key={l.id} className="mb-2 rounded-xl border border-hairline bg-surface px-3 py-2.5">
          <div className="text-[11px] font-bold text-soil">
            {fmtWhen(l.created_at)}{l.status ? ' · ' + STATUS[l.status].l : ''}
          </div>
          {l.text && <div className="my-1 text-sm">{l.text}</div>}
          {l.photo_url && (
            <img src={l.photo_url} loading="lazy" alt=""
              className="mt-1.5 w-full cursor-pointer rounded-lg"
              onClick={() => onShowPhoto(l.photo_url)} />
          )}
          <div className="text-[11px] font-semibold text-brand2">
            — {profiles[l.author] ? profiles[l.author].name : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}
