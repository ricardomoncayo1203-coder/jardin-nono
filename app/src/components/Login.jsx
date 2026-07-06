import { useState } from 'react'
import { sb, esErr, LOGIN_DOMAIN } from '../lib/supabase'

export default function Login() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function doLogin(e) {
    e.preventDefault()
    const u = user.trim()
    if (!u || !pass) { setErr('Escribe tu usuario y tu contraseña.'); return }
    const email = u.includes('@') ? u : u.toLowerCase() + '@' + LOGIN_DOMAIN
    setErr(''); setBusy(true)
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })
    setBusy(false)
    if (error) { setErr('No se pudo entrar: ' + esErr(error)) }
    /* si entra bien, onAuthStateChange en App hace el resto */
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(165deg,#2c5e33 0%,#1b3d20 55%,#12280f 100%)' }}>
      {/* hojas decorativas */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
           style={{ backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)', backgroundSize: '26px 26px' }} />
      <div className="anim-slide-up w-full max-w-[380px] rounded-3xl bg-white/95 p-7 shadow-float backdrop-blur">
        <div
          className="anim-pop mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
          style={{ background: 'linear-gradient(140deg,#e9f3ea,#d3e6d5)' }}
        >🌿</div>
        <h1 className="m-0 font-display text-[26px] font-semibold text-brand">Jardín de Nono</h1>
        <p className="mb-5 mt-1 text-[13px] leading-snug text-soil">
          Entra con tu usuario para ver y cuidar el jardín.
        </p>
        <form onSubmit={doLogin}>
          <label className="mb-1 block text-xs font-bold text-soil">Usuario</label>
          <input
            type="text" value={user} onChange={e => setUser(e.target.value)}
            autoCapitalize="none" autoCorrect="off" autoComplete="username"
            placeholder="ej: freddy" className="mb-4"
          />
          <label className="mb-1 block text-xs font-bold text-soil">Contraseña</label>
          <input
            type="password" value={pass} onChange={e => setPass(e.target.value)}
            autoComplete="current-password" placeholder="••••••••" className="mb-5"
          />
          <button
            type="submit" disabled={busy}
            className="w-full cursor-pointer rounded-xl border-none bg-brand py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <div className="mt-3 min-h-4 text-[13px] text-rojo">{err}</div>
      </div>
    </div>
  )
}
