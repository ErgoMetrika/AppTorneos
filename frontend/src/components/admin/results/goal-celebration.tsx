// Festejo a pantalla completa al guardar un resultado: botín que patea, arquero que se tira para el otro lado,
// pelota en cámara lenta contra la red, tribuna que salta y "¡GOOOOL!". En la final, además, copa y papelitos.
// Se cierra solo (o tocando / con Esc). Se ve completo siempre, aunque el equipo tenga "reducir movimiento".
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { TeamCrest, Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

import type { ScoreDraft } from './bracket-utils'

export interface GoalCelebrationData {
  local: string
  visitante: string
  draft: ScoreDraft
  tied: boolean
  winnerSide: 'local' | 'visitante'
  isFinal: boolean
}

// Geometría del arco (vista lateral) en el viewBox de 800×380
const FRONT_X = 640, TOP = 170, GROUND = 330, BACK_TOP = 705, BACK_BOT = 765, IMPACT_V = 0.45
const backX = (v: number) => BACK_TOP + (BACK_BOT - BACK_TOP) * v
const yAt = (v: number) => TOP + (GROUND - TOP) * v
const BALL0 = [200, 314] as const
const IMP = [backX(IMPACT_V) - 16, yAt(IMPACT_V)] as const
const CTRL = [450, 70] as const
const KICK = 380, IMPACT_T = 1000

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeIn = (t: number) => t * t * t
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const bez = (s: number) => [
  (1 - s) ** 2 * BALL0[0] + 2 * (1 - s) * s * CTRL[0] + s * s * IMP[0],
  (1 - s) ** 2 * BALL0[1] + 2 * (1 - s) * s * CTRL[1] + s * s * IMP[1],
] as const

function netPath(bulge: number) {
  const pt = (u: number, v: number) => {
    const k = Math.exp(-((v - IMPACT_V) ** 2) / 0.07) * u * u
    return `${(FRONT_X + (backX(v) - FRONT_X) * u + bulge * k).toFixed(1)} ${(yAt(v) + bulge * k * 0.2 * (v - IMPACT_V)).toFixed(1)}`
  }
  let d = ''
  for (let i = 0; i <= 9; i++) d += 'M' + Array.from({ length: 13 }, (_, j) => pt(j / 12, i / 9)).join('L')
  for (let j = 1; j <= 7; j++) d += 'M' + Array.from({ length: 15 }, (_, i) => pt(j / 7, i / 14)).join('L')
  return d
}

const GOL_LETTERS = ['¡', 'G', 'O', 'O', 'O', 'O', 'O', 'L', '!']
const CROWD_COLORS = ['#1d3a28', '#163020', '#244a33', '#1a3424']
const CROWD = Array.from({ length: 3 * 46 }, (_, n) => {
  const row = Math.floor(n / 46), i = n % 46
  return { x: -190 + i * 26 + (row % 2) * 13 + Math.sin(i * 7.3 + row) * 4, y: 92 + row * 30, fill: CROWD_COLORS[(i + row) % 4], ph: (i * 2.39 + row) % 6.28, sp: 0.8 + ((i * 13 + row * 7) % 10) / 16 }
})
const CONFETTI_COLORS = ['#35f46e', '#b9ffd0', '#f4f8f5']

interface Piece { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number; sway: number }

export function GoalCelebration({ data, onClose }: { data: GoalCelebrationData; onClose: () => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  // El último onClose en un ref: así la animación no se reinicia si el padre vuelve a renderizar
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  const [visible, setVisible] = useState(false)
  // Siempre se ve el festejo completo, aunque el equipo tenga activado "reducir movimiento"
  const [reduced] = useState(false)
  // Con movimiento reducido el número ya aparece actualizado
  const [bumped, setBumped] = useState(reduced)

  const { local, visitante, draft, tied, winnerSide, isFinal } = data
  const winner = winnerSide === 'local' ? local : visitante
  // El número que "sube": goles del ganador, o sus penales si se definió así
  const score = useMemo(() => {
    const goals = { local: draft.golesLocal, visitante: draft.golesVisitante }
    const pens = { local: draft.penalesLocal, visitante: draft.penalesVisitante }
    const target = tied ? pens : goals
    const before = { ...target, [winnerSide]: Math.max(0, target[winnerSide] - 1) }
    return { goals, pens, before, after: target }
  }, [draft, tied, winnerSide])

  const close = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => onCloseRef.current(), 200)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const q = <T extends Element = SVGElement>(k: string) => root.querySelector<T>(`[data-fx="${k}"]`)!
    const timers: number[] = []
    let raf = 0
    let confettiRaf = 0
    let pieces: Piece[] = []
    let closed = false
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))
    const finish = () => { if (!closed) { closed = true; close() } }

    requestAnimationFrame(() => setVisible(true))
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)

    // ----- Papelitos (canvas) -----
    const canvas = q<HTMLCanvasElement>('confetti')
    const ctx = canvas.getContext('2d')
    const size = () => {
      const d = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * d; canvas.height = window.innerHeight * d
      ctx?.setTransform(d, 0, 0, d, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
    const tick = () => {
      if (!ctx) return
      const W = window.innerWidth, H = window.innerHeight
      ctx.clearRect(0, 0, W, H)
      pieces = pieces.filter((p) => p.life < 220 && p.y < H + 30)
      for (const p of pieces) {
        p.vy += 0.2; p.vx *= 0.982; p.vy *= 0.982
        p.x += p.vx + Math.sin(p.life / 9 + p.sway) * 0.6; p.y += p.vy; p.r += p.vr; p.life++
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, (220 - p.life) / 40)
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 0.5); ctx.restore()
      }
      confettiRaf = pieces.length ? requestAnimationFrame(tick) : 0
    }
    const burst = (x: number, y: number, n: number, gold: boolean, dir?: number) => {
      for (let i = 0; i < n; i++) {
        const a = (dir ?? -Math.PI / 2) + (Math.random() - 0.5) * (dir !== undefined ? 0.5 : Math.PI * 1.3)
        const sp = (dir !== undefined ? 12 : 5) + Math.random() * 9
        pieces.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 7, h: 3 + Math.random() * 4, c: gold && Math.random() < 0.55 ? '#ffcc66' : CONFETTI_COLORS[i % 3], life: 0, sway: Math.random() * 6.28 })
      }
      if (!confettiRaf) confettiRaf = requestAnimationFrame(tick)
    }

    const letters = [...q<HTMLDivElement>('gol').children] as HTMLElement[]
    const showText = () => {
      letters.forEach((s, i) => s.animate(
        [{ opacity: 0, transform: 'translateY(40px) scale(.3) rotate(-12deg)' }, { opacity: 1, transform: 'translateY(-14px) scale(1.25) rotate(3deg)', offset: 0.6 }, { opacity: 1, transform: 'none' }],
        { duration: 460, delay: i * 45, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' },
      ))
      later(() => letters.slice(2, 7).forEach((s, i) => s.animate(
        [{ transform: 'none' }, { transform: 'translateY(-10px) scaleY(1.12)' }, { transform: 'none' }],
        { duration: 380, delay: i * 70, iterations: 3 },
      )), 820)
      q<HTMLDivElement>('score').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 420, fill: 'forwards' })
      later(() => setBumped(true), 900)
    }
    const showChampion = () => {
      q<HTMLDivElement>('trophy').animate(
        [{ opacity: 0, transform: 'translate(-50%, -30%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1.12)', offset: 0.7 }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }],
        { duration: 650, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' },
      )
      q<HTMLDivElement>('rays').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 14000, iterations: Infinity })
      q<HTMLDivElement>('champ').animate([{ opacity: 0, transform: 'translateY(12px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 350, fill: 'forwards' })
      const W = window.innerWidth, H = window.innerHeight
      burst(W * 0.2, H, 90, true, -1.1)
      burst(W * 0.8, H, 90, true, -2.05)
      later(() => burst(W / 2, H * 0.3, 120, true), 450)
    }

    if (reduced) {
      letters.forEach((s) => { s.style.opacity = '1' })
      q<HTMLDivElement>('score').style.opacity = '1'
      if (isFinal) { q<HTMLDivElement>('champ').style.opacity = '1'; q<HTMLDivElement>('trophy').style.opacity = '1' }
      later(finish, isFinal ? 3200 : 2400)
    } else {
      const scene = q('scene'), leg = q('leg'), ghost1 = q('ghost1'), ghost2 = q('ghost2'), keeper = q('keeper'), keeperShadow = q('keeperShadow')
      const ball = q('ball'), ballShadow = q('ballShadow'), net = q('net'), speed = q('speed'), ring = q('ring'), flashes = q('flashes')
      const heads = [...q('crowd').children] as SVGElement[]
      const legT = (a: number) => `rotate(${a} 132 142)`
      const setBall = (x: number, y: number, r: number) => {
        ball.setAttribute('transform', `translate(${x} ${y}) rotate(${r})`)
        const h = clamp((GROUND - y) / 250)
        ballShadow.setAttribute('cx', String(x)); ballShadow.setAttribute('rx', String(16 - h * 9)); ballShadow.setAttribute('opacity', String(0.45 - h * 0.3))
      }

      let last = performance.now(), t = 0
      let shownGol = false, shownChamp = false
      const hist = [0, 0, 0]
      const total = isFinal ? 4600 : 3300
      const frame = (now: number) => {
        const dtReal = Math.min(50, now - last); last = now
        // Cámara lenta justo antes de la red
        t += dtReal * (t > IMPACT_T - 230 && t < IMPACT_T + 40 ? 0.3 : 1)

        // Pierna: carga y patea, con estela
        const ang = t < 240 ? lerp(0, -42, easeOut(t / 240)) : t < KICK ? lerp(-42, 38, easeIn((t - 240) / (KICK - 240))) : lerp(38, 4, easeOut(clamp((t - KICK) / 450)))
        hist.unshift(ang); hist.length = 3
        const swinging = t > 240 && t < KICK + 120 ? 1 : 0
        leg.setAttribute('transform', legT(ang))
        ghost1.setAttribute('transform', legT(hist[1])); ghost1.setAttribute('opacity', String(swinging * 0.35))
        ghost2.setAttribute('transform', legT(hist[2])); ghost2.setAttribute('opacity', String(swinging * 0.15))

        // Arquero: se tira para el otro lado
        const k = easeInOut(clamp((t - 520) / 380))
        keeper.setAttribute('transform', `translate(${-k * 55} ${-Math.sin(k * Math.PI) * 38}) rotate(${-k * 78} 585 330)`)
        keeperShadow.setAttribute('cx', String(585 - k * 90)); keeperShadow.setAttribute('rx', String(30 + k * 30))

        if (t < KICK) setBall(BALL0[0], BALL0[1], 0)
        else if (t < IMPACT_T) {
          const s = 1 - (1 - (t - KICK) / (IMPACT_T - KICK)) ** 1.6
          const [x, y] = bez(s)
          setBall(x, y, s * 1080)
          if (s > 0.06 && s < 0.97) {
            const [px, py] = bez(Math.max(0, s - 0.08))
            const a = Math.atan2(y - py, x - px), cx = -Math.cos(a), cy = -Math.sin(a)
            speed.setAttribute('opacity', '0.6')
            speed.innerHTML = [-9, 0, 9].map((o, i) => {
              const ox = -cy * o, oy = cx * o, L = i === 1 ? 60 : 40
              return `<line x1="${x + cx * 22 + ox}" y1="${y + cy * 22 + oy}" x2="${x + cx * (22 + L) + ox}" y2="${y + cy * (22 + L) + oy}" stroke-width="${i === 1 ? 4 : 2.5}"/>`
            }).join('')
          }
        } else {
          speed.setAttribute('opacity', '0')
          const dt = t - IMPACT_T
          const bulge = 52 * Math.exp(-dt / 340) * Math.sin(dt / 80)
          net.setAttribute('d', netPath(Math.max(bulge, -12)))
          const fall = clamp((dt - 160) / 420)
          const bounce = fall === 1 ? Math.abs(Math.sin((dt - 580) / 75)) * 14 * Math.exp(-(dt - 580) / 160) : 0
          setBall(IMP[0] + Math.max(bulge, 0) * 0.9 - fall * 22, lerp(IMP[1], GROUND - 16, easeIn(fall)) - bounce, 1080 + dt * 0.35)
          const rk = clamp(dt / 380)
          ring.setAttribute('r', String(10 + rk * 70)); ring.setAttribute('opacity', String((1 - rk) * 0.8))
          if (dt < 300) { const m = (1 - dt / 300) * 8; scene.setAttribute('transform', `translate(${(Math.random() - 0.5) * m} ${(Math.random() - 0.5) * m})`) }
          else scene.setAttribute('transform', '')
          heads.forEach((h, i) => {
            const c = CROWD[i]
            h.setAttribute('transform', `translate(0 ${-Math.max(0, Math.sin((dt / 1000) * 6.28 * c.sp * 1.6 + c.ph)) * 9 * Math.min(1, dt / 200)})`)
          })
          if (Math.random() < 0.5 && dt < 2600) {
            const f = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            f.setAttribute('cx', String(-150 + Math.random() * 1100)); f.setAttribute('cy', String(80 + Math.random() * 80))
            f.setAttribute('r', String(2 + Math.random() * 3)); f.setAttribute('fill', '#ffffff')
            flashes.appendChild(f); later(() => f.remove(), 90)
          }
          if (!shownGol && dt > 40) {
            shownGol = true
            q<HTMLDivElement>('flash').animate([{ opacity: 0.35 }, { opacity: 0 }], { duration: 260 })
            showText()
            burst(window.innerWidth / 2, window.innerHeight * 0.55, 70, false)
          }
        }

        if (isFinal && t > 2000) {
          scene.style.opacity = String(lerp(1, 0.15, clamp((t - 2000) / 650)))
          if (!shownChamp) { shownChamp = true; showChampion() }
        }

        if (t > total) { finish(); return }
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(confettiRaf)
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', size)
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel())
    }
  }, [reduced, isFinal, close])

  // Al subir el número, un "pop"
  const bumpRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (bumped && !reduced) bumpRef.current?.animate([{ transform: 'scale(1.6) translateY(-6px)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.3)' })
  }, [bumped, reduced])

  const shown = bumped ? score.after : score.before
  const num = (side: 'local' | 'visitante') => (
    <span
      ref={side === winnerSide ? bumpRef : undefined}
      className={cn('inline-block min-w-[1.4em] rounded-md border px-[0.35em] text-center tabular-nums', bumped && side === winnerSide ? 'border-primary bg-primary text-[#06110b]' : 'border-[#1d3a28] bg-[#10271a] text-[#f4f8f5]')}
    >
      {shown[side]}
    </span>
  )
  const scoreLabel = tied
    ? `${local} ${score.goals.local} a ${score.goals.visitante} ${visitante}, ganó ${winner} ${score.pens[winnerSide]} a ${score.pens[winnerSide === 'local' ? 'visitante' : 'local']} por penales`
    : `${local} ${score.goals.local} a ${score.goals.visitante} ${visitante}`

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`¡Gol! Resultado guardado: ${scoreLabel}${isFinal ? `. ${winner} es el campeón` : ''}`}
      onClick={close}
      className={cn(
        'fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden px-4 transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{ background: 'rgba(4,12,7,0.9)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <canvas data-fx="confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

      {!reduced && (
        // Escena grande: hasta 1080 px, todo el ancho en el celu y sin pasarse del alto
        // (deja lugar abajo para el "¡GOOOL!" y el resultado)
        <div className="relative w-[min(1080px,100vw,calc((100dvh-250px)*2.1))] max-w-none shrink-0" aria-hidden="true">
          <svg viewBox="0 0 800 380" className="block h-auto w-full overflow-visible">
            <defs>
              <pattern id={`${uid}grass`} width="80" height="60" patternUnits="userSpaceOnUse">
                <rect width="40" height="60" fill="#0f3a20" /><rect x="40" width="40" height="60" fill="#0c321b" />
              </pattern>
              <radialGradient id={`${uid}spot`} cx="50%" cy="100%" r="75%">
                <stop offset="0" stopColor="#35f46e" stopOpacity=".2" /><stop offset="1" stopColor="#35f46e" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${uid}boot`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1c3a27" /><stop offset="1" stopColor="#07140c" />
              </linearGradient>
              <radialGradient id={`${uid}ball`} cx="35%" cy="30%" r="75%">
                <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d6ce" />
              </radialGradient>
              <g id={`${uid}leg`}>
                <path d="M120 140 q11 -6 24 0 l2 84 h-28 z" fill="#f4f8f5" />
                <rect x="118" y="186" width="28" height="9" fill="#35f46e" />
                <rect x="118" y="202" width="28" height="7" fill="#35f46e" />
                <path d="M115 222 h32 v30 q2 8 10 10 l30 8 q16 5 14 18 q-2 9 -14 9 h-68 q-8 0 -8 -8 z" fill={`url(#${uid}boot)`} stroke="#35f46e" strokeWidth="3" strokeLinejoin="round" />
                <path d="M113 289 h80" stroke="#35f46e" strokeWidth="4" strokeLinecap="round" />
                <path d="M150 236 l10 4 M146 246 l12 5 M143 256 l13 5" stroke="#f4f8f5" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M122 270 q28 -2 50 6" fill="none" stroke="#35f46e" strokeWidth="3" strokeLinecap="round" opacity=".8" />
                <g fill="#b9ffd0"><rect x="122" y="292" width="8" height="8" rx="2" /><rect x="146" y="292" width="8" height="8" rx="2" /><rect x="172" y="292" width="8" height="8" rx="2" /></g>
              </g>
            </defs>
            <g data-fx="scene">
              <rect x="-200" y="-40" width="1200" height="420" fill={`url(#${uid}spot)`} />
              {/* Tribuna */}
              <rect x="-200" y="60" width="1200" height="120" fill="#0a1a10" />
              <g data-fx="crowd">
                {CROWD.map((c, i) => (
                  <g key={i} fill={c.fill}>
                    <circle cx={c.x} cy={c.y} r="8" />
                    <path d={`M${c.x - 12} ${c.y + 26} q0 -16 12 -16 q12 0 12 16 z`} />
                  </g>
                ))}
              </g>
              <g data-fx="flashes" />
              <rect x="-200" y="176" width="1200" height="8" fill="#10271a" />
              <rect x="-200" y="184" width="1200" height="20" fill="#0b1b12" />
              <text x="400" y="199" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="600" letterSpacing="3" fill="#35f46e" fillOpacity=".7">TORNEO90 · TORNEO90 · TORNEO90 · TORNEO90</text>
              <rect x="-200" y="204" width="1200" height="126" fill="#0b2415" />
              <rect x="-200" y="330" width="1200" height="60" fill={`url(#${uid}grass)`} />
              <line x1="-200" y1="330" x2="1000" y2="330" stroke="#f4f8f5" strokeOpacity=".55" strokeWidth="2" />
              {/* Sombras */}
              <ellipse data-fx="ballShadow" cx={BALL0[0]} cy="332" rx="16" ry="4" fill="#000" opacity=".45" />
              <ellipse data-fx="keeperShadow" cx="585" cy="332" rx="30" ry="5" fill="#000" opacity=".4" />
              {/* Red */}
              <path data-fx="net" d={netPath(0)} fill="none" stroke="#f4f8f5" strokeOpacity=".38" strokeWidth="1.2" />
              {/* Arquero */}
              <g data-fx="keeper">
                <path d="M572 330 l6 -48 M598 330 l-6 -48" stroke="#10271a" strokeWidth="13" strokeLinecap="round" />
                <path d="M566 330 h14 M592 330 h14" stroke="#07140c" strokeWidth="7" strokeLinecap="round" />
                <path d="M566 286 q-2 -50 19 -58 q21 8 19 58 z" fill="#ff8a3d" />
                <path d="M572 248 l-30 -22 M598 248 l26 -24" stroke="#ff8a3d" strokeWidth="11" strokeLinecap="round" />
                <circle cx="540" cy="224" r="9" fill="#f4f8f5" /><circle cx="626" cy="222" r="9" fill="#f4f8f5" />
                <circle cx="585" cy="212" r="14" fill="#e8c4a6" />
                <path d="M571 208 q14 -18 28 0" fill="#3a2414" />
                <text x="585" y="272" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="20" fill="#06110b">1</text>
              </g>
              <path d={`M${FRONT_X} ${GROUND} V${TOP} H${BACK_TOP} L${BACK_BOT} ${GROUND}`} fill="none" stroke="#f4f8f5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <g data-fx="speed" stroke="#b9ffd0" strokeLinecap="round" opacity="0" />
              {/* Pierna con estela */}
              <use data-fx="ghost2" href={`#${uid}leg`} opacity="0" />
              <use data-fx="ghost1" href={`#${uid}leg`} opacity="0" />
              <use data-fx="leg" href={`#${uid}leg`} />
              {/* Pelota */}
              <g data-fx="ball" transform={`translate(${BALL0[0]} ${BALL0[1]})`}>
                <circle r="16" fill={`url(#${uid}ball)`} />
                <path d="M0 -6 L5.7 -1.9 L3.5 4.9 L-3.5 4.9 L-5.7 -1.9 Z" fill="#06110b" />
                <path d="M0 -16 L0 -6 M15.2 -5 L5.7 -1.9 M9.4 13 L3.5 4.9 M-9.4 13 L-3.5 4.9 M-15.2 -5 L-5.7 -1.9" stroke="#06110b" strokeWidth="1.6" />
                <circle r="16" fill="none" stroke="#06110b" strokeOpacity=".25" strokeWidth="1" />
              </g>
              <circle data-fx="ring" cx={IMP[0] + 16} cy={IMP[1]} r="10" fill="none" stroke="#b9ffd0" strokeWidth="4" opacity="0" />
            </g>
          </svg>

          {isFinal && (
            <div data-fx="trophy" className="absolute left-1/2 top-1/2 w-[30%] opacity-0" style={{ transform: 'translate(-50%, -50%)' }}>
              <div data-fx="rays" className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" style={{ background: 'repeating-conic-gradient(rgba(255,201,74,0.35) 0deg 10deg, transparent 10deg 30deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 70%)' }} />
              <Trophy shine className="block h-auto w-full drop-shadow-[0_12px_28px_rgba(242,201,76,0.45)]" />
              <TeamCrest name={winner} className="absolute left-1/2 top-[13%] h-auto w-[34%] -translate-x-1/2 drop-shadow-none" />
            </div>
          )}
        </div>
      )}

      {reduced && isFinal && (
        <div data-fx="trophy" className="relative w-28 opacity-0" aria-hidden="true">
          <Trophy className="block h-auto w-full" />
          <TeamCrest name={winner} className="absolute left-1/2 top-[13%] h-auto w-[34%] -translate-x-1/2 drop-shadow-none" />
        </div>
      )}

      <div data-fx="gol" aria-hidden="true" className="flex whitespace-nowrap font-display text-[clamp(58px,16vw,140px)] font-black leading-[0.85] text-primary" style={{ textShadow: '0 0 40px rgba(53,244,110,.45), 0 4px 0 #0a5a24' }}>
        {GOL_LETTERS.map((l, i) => <span key={i} className="inline-block opacity-0">{l}</span>)}
      </div>

      <div data-fx="score" aria-hidden="true" className="flex flex-wrap items-center justify-center gap-[0.4em] text-center font-display text-[clamp(18px,4.6vw,30px)] font-bold uppercase opacity-0">
        <span className="break-words">{local}</span>
        {tied ? <span className="tabular-nums">{score.goals.local}</span> : num('local')}
        <span className="text-[#8fa596]">–</span>
        {tied ? <span className="tabular-nums">{score.goals.visitante}</span> : num('visitante')}
        <span className="break-words">{visitante}</span>
        {tied && (
          <span className="flex w-full items-center justify-center gap-[0.4em] text-[0.75em] text-[#b7c8bd]">
            Penales {num('local')} – {num('visitante')}
          </span>
        )}
      </div>

      <div data-fx="champ" aria-hidden="true" className={cn('break-words text-center font-display text-[clamp(22px,6vw,36px)] font-extrabold uppercase text-[#ffc94a] opacity-0', !isFinal && 'hidden')} style={{ textShadow: '0 0 30px rgba(255,204,102,.4)' }}>
        ¡Campeón: {winner}!
      </div>

      <div data-fx="flash" aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white opacity-0" />
      <p className="absolute bottom-[calc(18px+env(safe-area-inset-bottom,0px))] font-mono text-xs uppercase tracking-[0.08em] text-[#b7c8bd]">Tocá para saltear</p>
    </div>,
    document.body,
  )
}
