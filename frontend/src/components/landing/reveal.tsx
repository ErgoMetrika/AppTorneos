// Bloque que aparece (fade + subida) al entrar en pantalla, y el encabezado de cada sección.
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { useReveal } from './use-reveal'

import './landing.css'

type RevealProps = {
  children: ReactNode
  className?: string
  // self: el bloque entero aparece; si no, sólo sus hijos con la clase lr-item (escalonados con --i)
  self?: boolean
  // Retraso de escalón para el bloque entero
  index?: number
  as?: 'div' | 'section' | 'ul' | 'header'
  style?: CSSProperties
  'aria-labelledby'?: string
}

export function Reveal({ children, className, self = true, index = 0, as: Tag = 'div', style, ...rest }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <Tag
      // Las etiquetas posibles son todas elementos HTML: la ref sirve igual
      ref={ref as never}
      className={cn('lr-reveal', self && 'lr-self', visible && 'is-visible', className)}
      style={{ '--i': index, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// Ceja en mono + título grande de sección
export function SectionHeading({ id, kicker, title, children, center = false }: { id: string; kicker: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={cn('flex flex-col gap-2.5', center && 'items-center text-center')}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
      <h2 id={id} className="font-display text-[44px] font-black uppercase leading-[0.95] md:text-[64px]">{title}</h2>
      {children}
    </Reveal>
  )
}

// Ancho y márgenes laterales de la portada (16 px a los costados)
export const SHELL = 'mx-auto w-full max-w-[1240px] px-4'
