// Escudos "pro": diez modelos con borde de metal en relieve, tela con textura y brillo.
// Se dibujan en SVG con el modelo y los colores que eligió el equipo.
import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { ESCUDO_COLORES, type EscudoBorde, type EscudoColor, type EscudoColor2, type EscudoModelo } from '@/lib/escudos'

import { teamInitials } from './palette'

const DISPLAY = "'Barlow Condensed', sans-serif"
const NOCHE = '#0b1b12'

const METALES: Record<EscudoBorde, { stops: string[]; sombra: string; tinta: string }> = {
  oro: { stops: ['#fff6d0', '#e0b43c', '#8c6512', '#f3d77e', '#a77b17'], sombra: '#6b4f0d', tinta: '#3a2a05' },
  plata: { stops: ['#ffffff', '#c9d1d6', '#5f6a71', '#eef2f4', '#848f96'], sombra: '#4a5358', tinta: '#22292d' },
}

// Formas que se repiten
const ESCUDO = 'M70 6L128 22V72C128 114 102 140 70 154C38 140 12 114 12 72V22Z'
const ESCUDO_IN = 'M70 15L119 29V72C119 108 96 131 70 144C44 131 21 108 21 72V29Z'

export interface ProCrestProps {
  name: string
  modelo: EscudoModelo
  color: EscudoColor
  color2?: EscudoColor2 | null
  borde?: EscudoBorde | null
  label?: string
  className?: string
}

export function ProCrest({ name, modelo, color, color2, borde, label, className }: ProCrestProps) {
  const uid = useId()
  const id = (key: string) => `${uid}${key}`
  const url = (key: string) => `url(#${id(key)})`

  const c = ESCUDO_COLORES[color] ?? ESCUDO_COLORES.verde
  const sec = color2 && color2 !== 'auto' ? ESCUDO_COLORES[color2]?.base : undefined
  const metal = METALES[borde ?? 'oro'] ?? METALES.oro
  const cuerpoOscuro = color === 'rojo' || color === 'azul' || color === 'negro'
  const tinta = cuerpoOscuro ? '#ffffff' : NOCHE
  const siglas = teamInitials(name)
  const tres = siglas.length > 2
  const nombre = (name ?? '').trim().toUpperCase()
  const franja = sec ?? c.dark
  const franjaOpacidad = sec ? 1 : 0.55
  const banda = sec ?? NOCHE

  // Texto: siglas o nombre. "metal" = relleno de metal con relieve.
  const texto = (contenido: string, x: number, y: number, size: number, fill: string, extra: { metal?: boolean; spacing?: number; ancho?: number } = {}) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily={DISPLAY}
      fontWeight={900}
      fontSize={size}
      letterSpacing={extra.spacing ?? 0}
      fill={extra.metal ? url('m') : fill}
      filter={extra.metal ? url('f') : undefined}
      textLength={extra.ancho}
      lengthAdjust={extra.ancho ? 'spacingAndGlyphs' : undefined}
    >
      {contenido}
    </text>
  )
  // Si el nombre no entra en la cinta, se comprime al ancho disponible
  const anchoNombre = (max: number, porLetra: number) => (nombre.length * porLetra > max ? max : undefined)
  const enArco = (radio: number, size: number, fill: string) => (
    <text fontFamily={DISPLAY} fontWeight={800} fontSize={size} letterSpacing={1.2} fill={fill}>
      <textPath href={`#${id('arco')}`} startOffset="50%" textAnchor="middle" textLength={nombre.length * size * 0.55 > Math.PI * radio * 1.1 ? Math.PI * radio * 1.1 : undefined} lengthAdjust="spacingAndGlyphs">{nombre}</textPath>
    </text>
  )
  const arco = (cx: number, cy: number, r: number) => <path id={id('arco')} d={`M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}`} fill="none" />

  const modelos: Record<EscudoModelo, ReactNode> = {
    pelota: (
      <>
        <path d={ESCUDO} fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d={ESCUDO_IN} fill={url('b')} />
          <g clipPath={url('ch')}>
            {[34, 63.5, 93].map((x) => <rect key={x} x={x} y="0" width="13" height="160" fill={franja} fillOpacity={franjaOpacidad} />)}
            <rect width="140" height="160" fill={url('t')} />
            <rect x="0" y="28" width="140" height="26" fill={NOCHE} fillOpacity="0.94" />
            <path d="M21 29L70 15L119 29V62C92 54 48 54 21 62Z" fill={url('s')} />
          </g>
        </g>
        {texto(siglas, 70, 48, tres ? 19 : 22, '', { metal: true, spacing: 1.5 })}
        <ellipse cx="72" cy="116" rx="20" ry="4" fill="#000" fillOpacity="0.35" />
        <circle cx="70" cy="90" r="24" fill={url('w')} stroke="#1a1f1c" strokeOpacity="0.5" />
        <path d="M70 81L78.6 87.2L75.3 97.3H64.7L61.4 87.2Z" fill="#1a1f1c" />
        <path d="M70 81V68M78.6 87.2L91 83M75.3 97.3L83 108M64.7 97.3L57 108M61.4 87.2L49 83" stroke="#1a1f1c" strokeWidth="1.5" />
        <path d="M66 66.5L70 68L74 66.5L73 70H67Z M89.5 79L91 83L93 87L94 81Z M85 108L83 108L80 112.5L85 110Z M55 108L57 108L60 112.5L55 110Z M46 87L49 83L50.5 79L46 81Z" fill="#1a1f1c" />
        <path d="M4 122H136L128 134L136 146H4L12 134Z" fill={url('m')} filter={url('f')} />
        <path d="M4 146L14 152V146Z M136 146L126 152V146Z" fill={metal.sombra} />
        {texto(nombre, 70, 138, 10.5, metal.tinta, { spacing: 1.2, ancho: anchoNombre(108, 6.5) })}
      </>
    ),
    alas: (
      <>
        <g fill={url('m')} filter={url('f')}>
          {['M40 64C24 56 10 44 2 28C16 38 30 42 42 44Z', 'M38 78C20 74 6 64 0 50C14 58 28 60 40 60Z', 'M38 92C22 92 9 84 3 72C16 77 28 78 40 76Z', 'M40 104C26 106 14 100 8 92C20 94 30 94 42 90Z'].map((d) => (
            <g key={d}><path d={d} /><path d={d} transform="translate(140 0) scale(-1 1)" /></g>
          ))}
        </g>
        <circle cx="70" cy="76" r="38" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <circle cx="70" cy="76" r="31" fill={url('b')} />
          <circle cx="70" cy="76" r="31" fill={url('t')} />
          <path d="M39 76A31 31 0 0 1 101 76C88 68 52 68 39 76Z" fill={url('s')} />
        </g>
        {texto(siglas, 70, tres ? 85 : 87, tres ? 26 : 32, tinta)}
        <text x="70" y="30" textAnchor="middle" fontSize="13" letterSpacing="6" fill={url('m')}>★★★</text>
        <path d="M22 120H118L111 131L118 142H22L29 131Z" fill={NOCHE} stroke={url('m')} strokeWidth="2" />
        {texto(nombre, 70, 135, 10, '', { metal: true, spacing: 1.2, ancho: anchoNombre(84, 6) })}
      </>
    ),
    rayo: (
      <>
        <path d="M12 10H58L70 18L82 10H128V74C128 114 102 140 70 154C38 140 12 114 12 74Z" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d="M21 19H55L70 28L85 19H119V74C119 108 96 131 70 144C44 131 21 108 21 74Z" fill={url('b')} />
          <g clipPath={url('cr')}>
            <path d="M0 170L150 0V170Z" fill={banda} fillOpacity="0.92" />
            <rect width="140" height="160" fill={url('q')} />
            <path d="M21 19H119V40C90 50 50 56 21 60Z" fill={url('s')} />
          </g>
        </g>
        <path d="M82 34L50 90H68L56 134L96 70H76L90 34Z" fill={c.base} filter={url('o')} opacity="0.9" />
        <path d="M82 34L50 90H68L56 134L96 70H76L90 34Z" fill={url('m')} filter={url('f')} />
        {texto(siglas, 44, tres ? 63 : 66, tres ? 22 : 28, tinta)}
        <text x="98" y="122" textAnchor="middle" fontSize="14" fill={c.base}>★</text>
      </>
    ),
    sol: (
      <>
        <g fill={url('m')} filter={url('f')}>
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={i % 2 === 0 ? 'M70 6L76 30H64Z' : 'M70 14L74 32H66Z'} transform={`rotate(${i * 22.5} 70 80)`} />
          ))}
          <circle cx="70" cy="80" r="47" />
        </g>
        <circle cx="70" cy="80" r="42" fill={NOCHE} />
        {sec && <circle cx="70" cy="80" r="29" fill="none" stroke={sec} strokeWidth="3" />}
        {arco(70, 80, 34)}
        {enArco(34, 8.5, url('m'))}
        <text x="70" y="117" textAnchor="middle" fontSize="7" letterSpacing="3" fill={url('m')}>★★★</text>
        <g filter={url('i')}>
          <circle cx="70" cy="80" r="26" fill={url('b')} />
          <circle cx="70" cy="80" r="26" fill={url('t')} />
          <path d="M44 80A26 26 0 0 1 96 80C86 73 54 73 44 80Z" fill={url('s')} />
        </g>
        <circle cx="70" cy="80" r="26" fill="none" stroke={url('m')} strokeWidth="2" />
        {texto(siglas, 70, tres ? 86 : 88, tres ? 18 : 24, tinta)}
      </>
    ),
    corona: (
      <>
        <path d="M36 38L30 10L50 24L70 4L90 24L110 10L104 38Z" fill={url('m')} filter={url('f')} />
        {[[30, 10, 4], [70, 4, 5], [110, 10, 4], [70, 28, 3.5]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={url('j')} />)}
        <path d="M14 40H126V82C126 120 102 144 70 156C38 144 14 120 14 82Z" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d="M22 48H118V82C118 114 97 135 70 146C43 135 22 114 22 82Z" fill={url('b')} />
          <g clipPath={url('cc')}>
            {[22, 46, 82, 106].map((x) => <rect key={x} x={x} y="0" width="12" height="160" fill={sec ?? '#f4f8f5'} fillOpacity="0.9" />)}
            <rect width="140" height="160" fill={url('t')} />
            <rect x="0" y="76" width="140" height="28" fill={NOCHE} fillOpacity="0.94" />
            <path d="M22 48H118V74C92 68 48 68 22 74Z" fill={url('s')} />
          </g>
        </g>
        <rect x="14" y="74" width="112" height="2.5" fill={url('m')} />
        <rect x="14" y="103.5" width="112" height="2.5" fill={url('m')} />
        {texto(siglas, 70, 98, tres ? 19 : 22, '', { metal: true, spacing: 2 })}
      </>
    ),
    estrellas: (
      <>
        <text x="70" y="22" textAnchor="middle" fontSize="18" letterSpacing="4" fill={url('m')} filter={url('f')}>★★★</text>
        <path d="M70 22L126 36V84C126 122 102 146 70 158C38 146 14 122 14 84V36Z" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d="M70 30L117 42V84C117 116 96 137 70 148C44 137 23 116 23 84V42Z" fill={url('b')} />
          <g clipPath={url('ce')}>
            <rect x="0" y="0" width="140" height="84" fill={NOCHE} fillOpacity="0.94" />
            {sec && <rect x="0" y="84" width="140" height="76" fill={sec} />}
            <rect width="140" height="160" fill={url('t')} />
            <path d="M23 112L70 88L117 112V128L70 104L23 128Z" fill={url('m')} filter={url('f')} />
            <path d="M23 42L70 30L117 42V64C92 58 48 58 23 64Z" fill={url('s')} fillOpacity="0.6" />
          </g>
        </g>
        {texto(siglas, 70, tres ? 69 : 72, tres ? 30 : 38, '', { metal: true, spacing: 1 })}
      </>
    ),
    parche: (
      <>
        <circle cx="70" cy="80" r="64" fill={c.dark} />
        <circle cx="70" cy="80" r="64" fill="none" stroke={NOCHE} strokeWidth="5" strokeDasharray="1.2 1.2" />
        <circle cx="70" cy="80" r="60" fill={c.base} />
        <circle cx="70" cy="80" r="60" fill={url('e')} />
        <circle cx="70" cy="80" r="56" fill="none" stroke={tinta} strokeWidth="1.4" strokeDasharray="3 2.4" strokeOpacity="0.9" />
        {arco(70, 80, 46)}
        {enArco(46, 11, tinta)}
        <text x="70" y="128" textAnchor="middle" fontSize="10" letterSpacing="4" fill={tinta}>★★★</text>
        <circle cx="70" cy="80" r="38" fill={NOCHE} />
        <circle cx="70" cy="80" r="38" fill={url('u')} />
        <circle cx="70" cy="80" r="34.5" fill="none" stroke={sec ?? c.base} strokeWidth="1.4" strokeDasharray="3 2.4" />
        {texto(siglas, 70, tres ? 88 : 90, tres ? 24 : 30, c.base)}
        <circle cx="70" cy="80" r="64" fill={url('r')} />
      </>
    ),
    llamas: (
      <>
        <path d={ESCUDO} fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d={ESCUDO_IN} fill={url('b')} />
          <g clipPath={url('ch')}>
            <rect width="140" height="160" fill={url('t')} />
            <path d="M14 150C24 126 18 112 30 94C34 106 40 110 42 100C44 86 54 76 54 60C64 72 70 86 68 102C74 96 78 86 78 74C90 88 98 102 92 120C100 114 106 104 106 92C118 108 124 126 124 150Z" fill={sec ?? c.dark} />
            <path d="M34 150C36 132 46 122 48 108C54 118 56 124 60 118C62 110 68 102 70 92C78 106 84 118 82 132C88 128 92 120 94 112C100 124 104 138 104 150Z" fill={url('m')} filter={url('f')} />
            <path d="M21 29L70 15L119 29V60C92 52 48 52 21 60Z" fill={url('s')} />
          </g>
        </g>
        {texto(siglas, 70, tres ? 66 : 69, tres ? 26 : 32, tinta)}
      </>
    ),
    diamante: (
      <>
        <path d="M70 4L134 80L70 156L6 80Z" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d="M70 16L122 80L70 144L18 80Z" fill={url('b')} />
          <g clipPath={url('cd')}>
            {sec && <rect x="0" y="94" width="140" height="66" fill={sec} />}
            <rect width="140" height="160" fill={url('q')} />
            <rect x="0" y="66" width="140" height="28" fill={NOCHE} fillOpacity="0.94" />
            <rect x="0" y="64" width="140" height="2.5" fill={url('m')} />
            <rect x="0" y="93.5" width="140" height="2.5" fill={url('m')} />
            <path d="M70 16L122 80H18Z" fill={url('s')} fillOpacity="0.7" />
          </g>
        </g>
        <text x="70" y="44" textAnchor="middle" fontSize="14" fill={url('m')}>★</text>
        <text x="70" y="128" textAnchor="middle" fontSize="14" fill={url('m')}>★</text>
        {texto(siglas, 70, 88, tres ? 19 : 24, '', { metal: true, spacing: 1.5 })}
      </>
    ),
    montana: (
      <>
        <path d="M14 14H126V84C126 120 100 144 70 156C40 144 14 120 14 84Z" fill={url('m')} filter={url('f')} />
        <g filter={url('i')}>
          <path d="M22 22H118V84C118 116 96 136 70 146C44 136 22 116 22 84Z" fill={url('b')} />
          <g clipPath={url('cm')}>
            <circle cx="98" cy="52" r="13" fill={url('m')} filter={url('f')} />
            <path d="M14 122L48 72L64 94L88 60L126 116V160H14Z" fill={sec ?? c.dark} />
            <path d="M48 72L56 84L50 82L44 88L42 81Z M88 60L98 74L92 72L86 78L82 70Z" fill="#f4f8f5" />
            <path d="M14 132C40 122 70 140 126 124V160H14Z" fill={NOCHE} fillOpacity="0.55" />
            <rect width="140" height="160" fill={url('t')} />
            <path d="M22 22H118V50C92 44 48 44 22 50Z" fill={url('s')} />
          </g>
        </g>
        {/* Placa oscura detrás de las siglas: el cielo es claro y sin ella no se leen */}
        <rect x="27" y={tres ? 34 : 33} width="46" height={tres ? 27 : 30} rx="5" fill={NOCHE} fillOpacity="0.82" stroke={url('m')} strokeWidth="1.5" />
        {texto(siglas, 50, tres ? 54 : 56, tres ? 22 : 28, color === 'negro' ? '#f4f8f5' : c.light)}
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 140 160"
      fill="none"
      overflow="visible"
      className={cn('drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)]', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <defs>
        <linearGradient id={id('m')} x1="0" y1="0" x2="1" y2="1">
          {metal.stops.map((stop, i) => <stop key={i} offset={[0, 0.3, 0.55, 0.8, 1][i]} stopColor={stop} />)}
        </linearGradient>
        <linearGradient id={id('b')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.light} /><stop offset="0.45" stopColor={c.base} /><stop offset="1" stopColor={c.dark} /></linearGradient>
        <linearGradient id={id('s')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id={id('w')} cx="0.38" cy="0.32" r="0.75"><stop offset="0" stopColor="#fff" /><stop offset="0.6" stopColor="#e3e8e5" /><stop offset="1" stopColor="#8d9893" /></radialGradient>
        <radialGradient id={id('j')} cx="0.35" cy="0.35" r="0.7"><stop offset="0" stopColor="#fff" /><stop offset="0.35" stopColor={c.base} /><stop offset="1" stopColor={c.dark} /></radialGradient>
        <radialGradient id={id('r')} cx="0.4" cy="0.35" r="0.75"><stop offset="0" stopColor="#fff" stopOpacity="0.22" /><stop offset="1" stopColor="#000" stopOpacity="0.25" /></radialGradient>
        <pattern id={id('t')} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" fill="#000" fillOpacity="0.09" /></pattern>
        <pattern id={id('q')} width="5" height="5" patternUnits="userSpaceOnUse"><rect width="2.5" height="2.5" fill="#000" fillOpacity="0.12" /><rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#000" fillOpacity="0.12" /></pattern>
        <pattern id={id('e')} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="1.5" height="3" fill="#000" fillOpacity="0.16" /><rect x="1.5" width="1.5" height="3" fill="#fff" fillOpacity="0.08" /></pattern>
        <pattern id={id('u')} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="1.5" height="3" fill="#000" fillOpacity="0.25" /><rect x="1.5" width="1.5" height="3" fill="#fff" fillOpacity="0.06" /></pattern>
        {/* Relieve: luz que pega desde arriba a la izquierda */}
        <filter id={id('f')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="bl" />
          <feSpecularLighting in="bl" surfaceScale="3.5" specularConstant="0.9" specularExponent="18" lightingColor="#fff" result="sp"><feDistantLight azimuth="235" elevation="42" /></feSpecularLighting>
          <feComposite in="sp" in2="SourceAlpha" operator="in" result="spc" />
          <feComposite in="SourceGraphic" in2="spc" operator="arithmetic" k1="0" k2="1" k3="0.7" k4="0" />
        </filter>
        {/* Sombra interna: el campo queda hundido dentro del borde */}
        <filter id={id('i')} x="-5%" y="-5%" width="110%" height="110%">
          <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
          <feGaussianBlur stdDeviation="3.5" />
          <feOffset dx="0" dy="3" result="sh" />
          <feFlood floodColor="#000" floodOpacity="0.6" />
          <feComposite in2="sh" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="inner" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="inner" /></feMerge>
        </filter>
        <filter id={id('o')} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
        <clipPath id={id('ch')}><path d={ESCUDO_IN} /></clipPath>
        <clipPath id={id('cr')}><path d="M21 19H55L70 28L85 19H119V74C119 108 96 131 70 144C44 131 21 108 21 74Z" /></clipPath>
        <clipPath id={id('cc')}><path d="M22 48H118V82C118 114 97 135 70 146C43 135 22 114 22 82Z" /></clipPath>
        <clipPath id={id('ce')}><path d="M70 30L117 42V84C117 116 96 137 70 148C44 137 23 116 23 84V42Z" /></clipPath>
        <clipPath id={id('cd')}><path d="M70 16L122 80L70 144L18 80Z" /></clipPath>
        <clipPath id={id('cm')}><path d="M22 22H118V84C118 116 96 136 70 146C44 136 22 116 22 84Z" /></clipPath>
      </defs>
      {modelos[modelo] ?? modelos.pelota}
    </svg>
  )
}
