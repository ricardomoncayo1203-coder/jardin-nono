import { createClient } from '@supabase/supabase-js'

/* ============ CONFIG (claves públicas — protegidas por RLS) ============ */
export const SUPABASE_URL = 'https://yyumodrltjeocbznqwld.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dW1vZHJsdGplb2Niem5xd2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDMxNzAsImV4cCI6MjA5ODU3OTE3MH0.z4RmgHfoAUxt3D43kZjzTfFYAJWpT1hbLMWTHjQCEvk'
/* ====================================================================== */

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

export const MAP_URL = `${SUPABASE_URL}/storage/v1/object/public/plant-photos/map/base_map.jpg`

/* usuario corto -> correo interno (los usuarios solo escriben su nombre) */
export const LOGIN_DOMAIN = 'jardinnono.com'

export const STATUS = {
  verde:    { l: 'Sana',              c: '#2f8f46' },
  amarillo: { l: 'En observación',    c: '#e0a90b' },
  rojo:     { l: 'Enferma / urgente', c: '#cf3b30' },
}
export const STATUS_ORDER = { rojo: 0, amarillo: 1, verde: 2 }

export const ZONE_COLORS = ['#7b5ea7', '#1f8a8a', '#3a6ea5', '#b0568c', '#8c6d46', '#5a6b7a']

export const DEFAULT_SETTINGS = { house_pin: { x: 67, y: 61 }, zones: [] }

const ERRORES = {
  'Invalid login credentials': 'Usuario o contraseña incorrectos.',
  'Email not confirmed': 'Tu cuenta aún no está confirmada.',
  'missing email or phone': 'Escribe tu usuario y tu contraseña.',
  'Failed to fetch': 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  'Load failed': 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  'NetworkError': 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  'signal timed out': 'La conexión tardó demasiado. Intenta de nuevo.',
  'JWT expired': 'Tu sesión expiró. Vuelve a entrar.',
  'row-level security': 'No tienes permiso para hacer esto.',
}

export function esErr(e) {
  const m = (e && e.message) || String(e || '')
  for (const k in ERRORES) { if (m.includes(k)) return ERRORES[k] }
  return m || 'No se pudo completar la operación.'
}

/* fotos de referencia locales (del recorrido); las nuevas viven en Storage */
const LOCAL_PHOTOS = new Set([
  '#1','#2','#3','#4','#5','#6','#7','#8','#9','#10','#11','#12','#13','#14','#15','#16','#17','#18',
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O',
])

export function refPhoto(p) {
  if (!p) return null
  if (p.reference_photo_url) return p.reference_photo_url
  const id = String(p.id)
  return LOCAL_PHOTOS.has(id) ? `plantas/${id.replace('#', 'p')}.jpg` : null
}

export function fmtWhen(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-EC') + ' ' +
    d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}
