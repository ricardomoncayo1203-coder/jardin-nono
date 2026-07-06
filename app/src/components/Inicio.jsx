import { Dot, Hint } from './ui'

function secCounts(plants, loc) {
  let v = 0, a = 0, r = 0
  plants.forEach(p => {
    if (p.loc !== loc) return
    p.status === 'verde' ? v++ : p.status === 'amarillo' ? a++ : r++
  })
  return { v, a, r, t: v + a + r }
}

function MiniSem({ c }) {
  return (
    <div className="mt-2.5 text-[13px] font-bold">
      <span className="inline-flex items-center gap-1"><Dot status="verde" /> {c.v}</span>
      <span className="ml-2 inline-flex items-center gap-1"><Dot status="amarillo" /> {c.a}</span>
      <span className="ml-2 inline-flex items-center gap-1"><Dot status="rojo" /> {c.r}</span>
      <div className="mt-0.5 text-[11px] font-normal text-soil">{c.t} plantas</div>
    </div>
  )
}

export default function Inicio({ me, plants, onGo }) {
  const int = secCounts(plants, 'sunroom')
  const ext = secCounts(plants, 'exterior')
  let v = 0, a = 0, r = 0
  plants.forEach(p => { p.status === 'verde' ? v++ : p.status === 'amarillo' ? a++ : r++ })

  const stat = (n, l, s) => (
    <div className="flex-1 rounded-2xl border border-hairline bg-surface px-1.5 py-2.5 text-center shadow-card">
      <div className="text-[22px] font-extrabold leading-none">
        {s ? <span className="inline-flex items-center gap-1.5"><Dot status={s} /> {n}</span> : n}
      </div>
      <div className="mt-1 text-[11px] text-soil">{l}</div>
    </div>
  )

  return (
    <div className="anim-fade">
      <div className="mb-1 mt-1 font-display text-[15px] text-soil">
        Hola, <b className="text-brand">{me?.name || ''}</b> 🌱
      </div>
      <div className="mb-3 flex gap-2">
        {stat(plants.length, 'Plantas')}
        {stat(v, 'Sanas', 'verde')}
        {stat(a, 'Observación', 'amarillo')}
        {stat(r, 'Urgentes', 'rojo')}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div onClick={() => onGo('interior')}
          className="cursor-pointer rounded-3xl border border-hairline bg-surface px-3 py-6 text-center shadow-card transition active:scale-[0.97]">
          <div className="text-5xl leading-none">🏠</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-brand">Interior</div>
          <div className="mt-0.5 text-[11px] text-soil">Invernadero · plantas A–O</div>
          <MiniSem c={int} />
        </div>
        <div onClick={() => onGo('exterior')}
          className="cursor-pointer rounded-3xl border border-hairline bg-surface px-3 py-6 text-center shadow-card transition active:scale-[0.97]">
          <div className="text-5xl leading-none">🌳</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-brand">Exterior</div>
          <div className="mt-0.5 text-[11px] text-soil">Jardín · plantas #1–#18</div>
          <MiniSem c={ext} />
        </div>
      </div>
      <Hint>Elige una sección. En el mapa del exterior, toca un pin para ver esa planta o una zona de color para ver sus plantas.</Hint>
    </div>
  )
}
