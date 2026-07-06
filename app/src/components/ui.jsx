import { useEffect, useState } from 'react'
import { STATUS } from '../lib/supabase'

/* Las hojas y diálogos usan animaciones CSS puras (no dependen de JS/rAF):
   más fiables en teléfonos viejos y nunca se quedan "congeladas". */

/* ---------- punto de estado (semáforo) ---------- */
export function Dot({ status, size = 11 }) {
  return <span className="inline-block rounded-full align-middle"
    style={{ width: size, height: size, background: STATUS[status]?.c || '#999' }} />
}

/* ---------- hoja inferior (bottom sheet) ----------
   Se cierra SOLO con el botón ✕ (como el app clásico): un toque accidental
   en el fondo no puede borrar un registro a medio escribir. */
export function Sheet({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-[100] flex items-end bg-black/45">
      <div className="anim-slide-up max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-cream">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-cream/95 px-4 py-3 backdrop-blur">
          <h2 className="m-0 font-display text-[18px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-brand text-sm font-semibold text-white">✕</button>
        </div>
        <div className="p-4 pb-8">{children}</div>
      </div>
    </div>
  )
}

/* ---------- visor de foto (lightbox) ---------- */
export function Lightbox({ url, onClose }) {
  if (!url) return null
  return (
    <div className="anim-fade fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}>
      <button aria-label="Cerrar"
        className="absolute right-4 top-4 h-11 w-11 cursor-pointer rounded-xl border-none bg-white/20 text-lg font-bold text-white">✕</button>
      <img src={url} alt="Foto de la planta"
        className="anim-pop max-h-[92vh] max-w-full rounded-xl" />
    </div>
  )
}

/* ---------- diálogo con campo de texto (reemplaza prompt()) ---------- */
export function InputDialog({ open, title, placeholder, initial = '', submitLabel = 'Guardar', onSubmit, onClose }) {
  const [val, setVal] = useState(initial)
  useEffect(() => { if (open) setVal(initial) }, [open, initial])
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-[250] flex items-center justify-center bg-black/45 p-6"
      onClick={onClose}>
      <div className="anim-pop w-full max-w-[340px] rounded-2xl bg-white p-5 shadow-float"
        onClick={e => e.stopPropagation()}>
        <h3 className="m-0 mb-3 font-display text-[17px] font-semibold">{title}</h3>
        <form onSubmit={e => { e.preventDefault(); const v = val.trim(); if (v) { onSubmit(v); onClose() } }}>
          <input autoFocus value={val} placeholder={placeholder}
            onChange={e => setVal(e.target.value)} className="mb-4" />
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="min-h-10 flex-1 cursor-pointer rounded-xl border border-hairline bg-white py-2.5 text-sm font-bold text-ink">Cancelar</button>
            <button type="submit"
              className="min-h-10 flex-1 cursor-pointer rounded-xl border-none bg-brand py-2.5 text-sm font-bold text-white">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------- aviso / hint ---------- */
export function Hint({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[#ecd98a] bg-[#fff8e1] px-3 py-2.5 text-xs leading-relaxed text-soil ${className}`}>
      {children}
    </div>
  )
}

/* ---------- barra de filtros (todas / mías / semáforo) ---------- */
export function FilterBar({ filter, setFilter }) {
  const btn = (f, label) => (
    <button key={f} onClick={() => setFilter(f)}
      className={`min-h-10 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
        ${filter === f ? 'border-brand bg-brand text-white' : 'border-hairline bg-surface text-soil'}`}>
      {label}
    </button>
  )
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {btn('all', 'Todas')}
      {btn('mine', '🙋 Mis plantas')}
      {btn('rojo', <span className="inline-flex items-center gap-1.5"><Dot status="rojo" /> Urgentes</span>)}
      {btn('amarillo', <span className="inline-flex items-center gap-1.5"><Dot status="amarillo" /> Observación</span>)}
      {btn('verde', <span className="inline-flex items-center gap-1.5"><Dot status="verde" /> Sanas</span>)}
    </div>
  )
}
