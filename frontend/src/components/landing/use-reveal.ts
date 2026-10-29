// Hooks de movimiento de la portada: revelado al hacer scroll, "reducir movimiento"
// y un contador que sube desde 0. Sin soporte de IntersectionObserver todo queda visible.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia(REDUCED_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED_QUERY).matches
}

// true si la persona pidió "reducir movimiento" en su sistema
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false)
}

const canObserve = () => typeof window !== 'undefined' && 'IntersectionObserver' in window

// Devuelve una ref para el elemento y si ya entró en pantalla (una sola vez: no se vuelve a ocultar)
export function useReveal<T extends Element = HTMLDivElement>({ rootMargin = '0px 0px -12% 0px' }: { rootMargin?: string } = {}) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(() => !canObserve())

  useEffect(() => {
    const element = ref.current
    if (visible || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return { ref, visible }
}

// Número que cuenta desde 0 hasta target cuando run pasa a true (o cuando cambia el valor).
// Con "reducir movimiento" devuelve el valor final directamente.
export function useCountUp(target: number, run: boolean, duration = 900) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!run || reduced) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, run, reduced, duration])

  return reduced ? target : value
}
