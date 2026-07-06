import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LogOut, TreePine, Sprout, FileBarChart2, Pencil, Home as HomeIcon,
  Check, Undo2, X, Map as MapIcon, Leaf,
} from 'lucide-react'
import {
  sb, esErr, DEFAULT_SETTINGS, ZONE_COLORS, STATUS_ORDER,
} from './lib/supabase'
import { zoneOf } from './lib/geometry'
import Login from './components/Login'
import Inicio from './components/Inicio'
import MapView from './components/MapView'
import PlantSheet from './components/PlantSheet'
import Reporte from './components/Reporte'
import BottomNav from './components/BottomNav'
import { ZoneSheet, ZoneManager, ZoneNotes } from './components/zones'
import { PlantCard, PlantCardBig } from './components/cards'
import { Sheet, Lightbox, InputDialog, Hint, FilterBar } from './components/ui'

export default function App() {
  const [session, setSession] = useState(undefined)   /* undefined = cargando */
  const [me, setMe] = useState(null)
  const [plants, setPlants] = useState([])
  const [profiles, setProfiles] = useState({})
  const [settings, setSettings] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SETTINGS)))
  const [view, setView] = useState('inicio')          /* inicio | exterior | interior | reporte */
  const [filter, setFilter] = useState('all')
  const [zoneFocus, setZoneFocus] = useState(null)
  const [sheet, setSheet] = useState(null)            /* {type:'plant',id} | {type:'zone',id} | {type:'zones'} */
  const [placing, setPlacing] = useState(null)        /* {mode:'pin',id} | {mode:'house'} | {mode:'draw',zoneId,points} */
  const [lightbox, setLightbox] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [ready, setReady] = useState(false)
  const bootedFor = useRef(null)
  const hashDone = useRef(false)

  const isAdmin = me?.role === 'admin'

  /* ---------------- sesión ---------------- */
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session: s } }) => setSession(s))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setMe(null); setReady(false); bootedFor.current = null; return }
    if (bootedFor.current === session.user.id) return
    bootedFor.current = session.user.id
    boot(session.user)
  }, [session])   // eslint-disable-line react-hooks/exhaustive-deps

  async function boot(user) {
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single()
    const meNow = prof || { id: user.id, name: (user.email || '').split('@')[0], role: 'gardener' }
    setMe(meNow)
    await Promise.all([loadProfiles(), loadSettings(meNow), loadPlants()])
    setReady(true)
  }

  async function loadProfiles() {
    const { data } = await sb.from('profiles').select('id,name,role')
    const map = {}
    ;(data || []).forEach(p => { map[p.id] = p })
    setProfiles(map)
  }

  async function loadSettings(meNow) {
    const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    try {
      const { data, error } = await sb.from('app_settings').select('key,value')
      if (error) throw error
      ;(data || []).forEach(r => { s[r.key] = r.value })
      if (meNow && meNow.role === 'admin') {
        const have = (data || []).map(r => r.key)
        for (const k of ['house_pin', 'zones']) {
          if (!have.includes(k)) await sb.from('app_settings').upsert({ key: k, value: s[k] })
        }
      }
    } catch { /* tabla aún no creada: la app usa valores por defecto */ }
    setSettings(s)
  }

  const loadPlants = useCallback(async () => {
    const { data, error } = await sb.from('plants').select('*').order('loc').order('id')
    if (error) { alert('No se pudieron cargar las plantas: ' + esErr(error)); return }
    setPlants(data || [])
  }, [])

  async function saveSetting(key, next) {
    setSettings(next)
    try {
      const { error } = await sb.from('app_settings').upsert({ key, value: next[key] })
      if (error) throw error
    } catch (e) { alert('No se pudo guardar en la nube: ' + esErr(e)) }
  }

  async function doLogout() {
    await sb.auth.signOut()
    window.location.reload()
  }

  /* ---------------- enlace directo del QR (#p=ID) ---------------- */
  useEffect(() => {
    if (!ready || !plants.length) return
    const go = () => {
      const m = (window.location.hash || '').match(/[#&]p=([^&]+)/)
      if (!m) return
      const id = decodeURIComponent(m[1])
      const p = plants.find(x => x.id === id)
      if (!p) return
      setView(p.loc === 'exterior' ? 'exterior' : 'interior')
      setSheet({ type: 'plant', id: p.id })
    }
    if (!hashDone.current) { hashDone.current = true; go() }
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [ready, plants])

  /* ---------------- navegación (barra inferior) ---------------- */
  function nav(v) {
    if (placing?.mode === 'draw') cancelZoneDraw()
    else setPlacing(null)
    setView(v)
    setZoneFocus(null)
    window.scrollTo(0, 0)
  }

  /* ---------------- colocar pin / casa / dibujar zona ---------------- */
  function startPlacePin(id) {
    setSheet(null)
    setView('exterior')
    setZoneFocus(null)   /* igual que el app clásico: colocar pines siempre en el mapa completo */
    setPlacing({ mode: 'pin', id })
  }
  function startPlaceHouse() {
    setPlacing({ mode: 'house' })
  }
  function startZoneDraw(zoneId) {
    setSheet(null)
    setView('exterior')
    setZoneFocus(null)
    setPlacing({ mode: 'draw', zoneId, points: [] })
  }

  async function handlePlace(xy) {
    if (!placing) return
    if (placing.mode === 'draw') {
      const pt = [Math.round(xy.x * 10) / 10, Math.round(xy.y * 10) / 10]
      setPlacing(pl => ({ ...pl, points: [...pl.points, pt] }))
      return
    }
    if (placing.mode === 'house') {
      const next = { ...settings, house_pin: { x: Math.round(xy.x * 10) / 10, y: Math.round(xy.y * 10) / 10 } }
      setPlacing(null)
      await saveSetting('house_pin', next)
      return
    }
    if (placing.mode === 'pin') {
      const id = placing.id
      setPlacing(null)
      const { error } = await sb.from('plants').update({ x: Math.round(xy.x), y: Math.round(xy.y) }).eq('id', id)
      if (error) { alert('No se pudo mover el pin: ' + esErr(error)); return }
      await loadPlants()
      setSheet({ type: 'plant', id })
    }
  }

  function undoVertex() {
    setPlacing(pl => pl && pl.mode === 'draw'
      ? { ...pl, points: pl.points.slice(0, -1) }
      : pl)
  }
  async function finishZoneDraw() {
    if (!placing || placing.mode !== 'draw') return
    if (placing.points.length < 3) { alert('Marca al menos 3 puntos (las esquinas del área).'); return }
    const zones = (settings.zones || []).map(z =>
      z.id === placing.zoneId ? { ...z, points: placing.points } : z)
    setPlacing(null)
    await saveSetting('zones', { ...settings, zones })
  }
  function cancelZoneDraw() {
    const z = (settings.zones || []).find(x => x.id === placing?.zoneId)
    if (z && (!z.points || !z.points.length)) {
      /* zona nueva sin límites: se descarta */
      setSettings(s => ({ ...s, zones: (s.zones || []).filter(x => x.id !== z.id) }))
    }
    setPlacing(null)
  }

  /* ---------------- zonas: crear / renombrar / borrar ---------------- */
  function newZone() {
    /* la hoja "Zonas" queda abierta detrás; si cancelas el diálogo, sigues donde estabas */
    setDialog({
      title: 'Nombre de la zona',
      placeholder: 'ej. Huerto, Jardín de la Abuela',
      initial: '',
      onSubmit: name => {
        const zones = settings.zones || []
        const z = { id: 'z' + Date.now(), name, color: ZONE_COLORS[zones.length % ZONE_COLORS.length], points: [] }
        setSettings(s => ({ ...s, zones: [...(s.zones || []), z] }))
        startZoneDraw(z.id)
      },
    })
  }
  function renameZone(zid) {
    const z = (settings.zones || []).find(x => x.id === zid)
    if (!z) return
    setDialog({
      title: 'Nuevo nombre',
      placeholder: z.name,
      initial: z.name,
      onSubmit: async name => {
        const zones = (settings.zones || []).map(x => x.id === zid ? { ...x, name } : x)
        await saveSetting('zones', { ...settings, zones })
      },
    })
  }
  async function deleteZone(zid) {
    if (!window.confirm('¿Eliminar esta zona? (las plantas no se borran)')) return
    const zones = (settings.zones || []).filter(x => x.id !== zid)
    setSheet(null)
    if (zoneFocus === zid) setZoneFocus(null)
    await saveSetting('zones', { ...settings, zones })
  }

  /* ---------------- listas ---------------- */
  function filteredRows(loc) {
    let rows = plants.filter(p => {
      if (filter === 'mine') return p.assigned_to === me?.id
      if (filter === 'rojo' || filter === 'amarillo' || filter === 'verde') return p.status === filter
      return true
    })
    rows = rows.filter(p => p.loc === loc)
    if (loc === 'exterior' && zoneFocus) rows = rows.filter(p => (zoneOf(p, settings.zones) || {}).id === zoneFocus)
    rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    return rows
  }

  /* ---------------- textos del modo del mapa ---------------- */
  const modeText = !placing ? 'Toca un pin o una zona'
    : placing.mode === 'pin' ? `Toca el mapa para colocar ${placing.id}`
    : placing.mode === 'house' ? 'Toca el mapa donde está la casa'
    : 'Toca las esquinas del área (mín. 3 puntos)'

  /* ---------------- render ---------------- */
  if (session === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(165deg,#2c5e33,#1b3d20)' }}>
        <Leaf size={40} className="animate-pulse text-white/80" aria-label="Cargando" />
      </div>
    )
  }
  if (!session) return <Login />
  if (!ready) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-cream">
        <Sprout size={38} className="animate-bounce text-brand" aria-hidden="true" />
        <div className="text-sm font-semibold text-soil">Cargando el jardín…</div>
      </div>
    )
  }

  const sheetPlant = sheet?.type === 'plant' ? plants.find(p => p.id === sheet.id) : null
  const sheetZone = sheet?.type === 'zone' ? (settings.zones || []).find(z => z.id === sheet.id) : null
  const focusZone = zoneFocus ? (settings.zones || []).find(z => z.id === zoneFocus) : null
  const drawnZones = (settings.zones || []).filter(z => z.points && z.points.length >= 3)

  const sheetTitle = sheetPlant ? `Expediente ${sheetPlant.id}`
    : sheetZone ? `Zona: ${sheetZone.name} (${plants.filter(p => p.loc === 'exterior' && (zoneOf(p, settings.zones) || {}).id === sheetZone.id).length})`
    : sheet?.type === 'zones' ? 'Zonas del jardín'
    : ''

  const sectionTitle = view === 'exterior'
    ? { icon: TreePine, label: 'Exterior — Jardín' }
    : view === 'interior'
    ? { icon: Sprout, label: 'Interior — Invernadero' }
    : view === 'reporte'
    ? { icon: FileBarChart2, label: 'Reporte mensual' }
    : null

  return (
    <div className="min-h-dvh pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 text-white shadow-md"
        style={{ background: 'linear-gradient(120deg,#2c5e33,#25522c)' }}>
        <div>
          <h1 className="m-0 font-display text-[17px] font-semibold">Jardín de Nono</h1>
          <div className="text-[11px] opacity-85">Seguimiento de plantas</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span><b>{me?.name}</b>{isAdmin ? ' · admin' : ''}</span>
          <button onClick={doLogout} aria-label="Cerrar sesión"
            className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
            <LogOut size={14} aria-hidden="true" /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-3.5">
        {sectionTitle && (
          <div className="mb-3 flex items-center gap-2">
            <sectionTitle.icon size={19} className="text-brand" aria-hidden="true" />
            <span className="font-display text-[17px] font-semibold">{sectionTitle.label}</span>
          </div>
        )}

        {view === 'inicio' && <Inicio me={me} plants={plants} onGo={nav} />}

        {view === 'exterior' && (
          <div className="anim-fade">
            {/* herramientas admin + dibujo */}
            {(isAdmin || placing?.mode === 'draw') && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isAdmin && !placing && <>
                  <button onClick={() => setSheet({ type: 'zones' })}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-soil">
                    <Pencil size={13} aria-hidden="true" /> Zonas
                  </button>
                  <button onClick={startPlaceHouse}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-soil">
                    <HomeIcon size={13} aria-hidden="true" /> Mover casa
                  </button>
                </>}
                {placing?.mode === 'draw' && <>
                  <button onClick={finishZoneDraw}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-brand bg-brand px-3.5 py-1.5 text-xs font-semibold text-white">
                    <Check size={13} aria-hidden="true" /> Listo
                  </button>
                  <button onClick={undoVertex}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-soil">
                    <Undo2 size={13} aria-hidden="true" /> Deshacer
                  </button>
                  <button onClick={cancelZoneDraw}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-soil">
                    <X size={13} aria-hidden="true" /> Cancelar
                  </button>
                </>}
                {placing && placing.mode !== 'draw' && (
                  <button onClick={() => setPlacing(null)}
                    className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-soil">
                    <X size={13} aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
            )}

            {/* chips de zonas */}
            {drawnZones.length > 0 && (
              <div className="chipbar mb-2 flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => { setZoneFocus(null); window.scrollTo(0, 0) }}
                  className={`flex min-h-10 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold
                    ${!zoneFocus ? 'border-brand bg-brand text-white' : 'border-hairline bg-surface text-soil'}`}>
                  <MapIcon size={13} aria-hidden="true" /> Todas
                </button>
                {drawnZones.map(z => (
                  <button key={z.id} onClick={() => { setZoneFocus(z.id); window.scrollTo(0, 0) }}
                    className={`min-h-10 flex-none cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold
                      ${zoneFocus === z.id ? 'border-brand bg-brand text-white' : 'border-hairline bg-surface text-soil'}`}>
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: z.color }} />
                    {z.name}
                  </button>
                ))}
              </div>
            )}

            <MapView
              plants={plants} settings={settings} zoneFocus={zoneFocus}
              placing={placing} modeText={modeText}
              onOpenPlant={id => setSheet({ type: 'plant', id })}
              onOpenZone={id => setSheet({ type: 'zone', id })}
              onGoInterior={() => nav('interior')}
              onPlace={handlePlace}
            />

            {focusZone && <ZoneNotes zone={focusZone} me={me} profiles={profiles} onShowPhoto={setLightbox} />}

            <div className="mt-4">
              <FilterBar filter={filter} setFilter={setFilter} />
              {filteredRows('exterior').length === 0 && <Hint>No hay plantas en este filtro.</Hint>}
              {filteredRows('exterior').map(p => (
                <PlantCard key={p.id} p={p} profiles={profiles} zones={settings.zones}
                  onOpen={id => setSheet({ type: 'plant', id })} />
              ))}
            </div>
          </div>
        )}

        {view === 'interior' && (
          <div className="anim-fade">
            <Hint className="mb-3">Plantas del invernadero (A–O), dentro de la casa.</Hint>
            <FilterBar filter={filter} setFilter={setFilter} />
            {filteredRows('sunroom').length === 0 && <Hint>No hay plantas en este filtro.</Hint>}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredRows('sunroom').map(p => (
                <PlantCardBig key={p.id} p={p} onOpen={id => setSheet({ type: 'plant', id })} />
              ))}
            </div>
          </div>
        )}

        {view === 'reporte' && isAdmin && (
          <Reporte plants={plants} profiles={profiles} settings={settings} onShowPhoto={setLightbox} />
        )}
      </main>

      <BottomNav view={view} isAdmin={isAdmin} onGo={nav} />

      {/* hoja inferior */}
      <Sheet open={!!sheet && (sheetPlant || sheetZone || sheet?.type === 'zones')}
        title={sheetTitle} onClose={() => setSheet(null)}>
        {sheetPlant && (
          <PlantSheet
            plant={sheetPlant} me={me} isAdmin={isAdmin}
            profiles={profiles} zones={settings.zones}
            onReload={loadPlants}
            onShowPhoto={setLightbox}
            onPlacePin={startPlacePin}
          />
        )}
        {sheetZone && (
          <ZoneSheet
            zone={sheetZone} plants={plants} profiles={profiles}
            settings={settings} isAdmin={isAdmin}
            onOpenPlant={id => setSheet({ type: 'plant', id })}
            onRename={() => renameZone(sheetZone.id)}
            onRedraw={() => startZoneDraw(sheetZone.id)}
            onDelete={() => deleteZone(sheetZone.id)}
          />
        )}
        {sheet?.type === 'zones' && (
          <ZoneManager settings={settings} onNew={newZone} onDraw={startZoneDraw} />
        )}
      </Sheet>

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />

      <InputDialog
        open={!!dialog}
        title={dialog?.title || ''}
        placeholder={dialog?.placeholder || ''}
        initial={dialog?.initial || ''}
        onSubmit={v => dialog?.onSubmit?.(v)}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
