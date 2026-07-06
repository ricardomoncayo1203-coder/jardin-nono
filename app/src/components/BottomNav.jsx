import { Home, TreePine, Sprout, FileBarChart2 } from 'lucide-react'

/* Navegación inferior fija: el jardinero siempre sabe dónde está y
   cambia de sección con un toque (targets ≥56px, iconos + texto). */
export default function BottomNav({ view, isAdmin, onGo }) {
  const items = [
    { v: 'inicio', icon: Home, label: 'Inicio' },
    { v: 'exterior', icon: TreePine, label: 'Exterior' },
    { v: 'interior', icon: Sprout, label: 'Interior' },
    ...(isAdmin ? [{ v: 'reporte', icon: FileBarChart2, label: 'Reporte' }] : []),
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-hairline bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-lg">
        {items.map(({ v, icon: Icon, label }) => {
          const on = view === v
          return (
            <button key={v} onClick={() => onGo(v)} aria-label={label}
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5
                border-none bg-transparent px-1 py-1.5 text-[11px] font-bold transition
                ${on ? 'text-brand' : 'text-soil'}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${on ? 'bg-brand/10' : ''}`}>
                <Icon size={20} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
