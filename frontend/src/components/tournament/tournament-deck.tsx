// Mazo de tarjetas para celu: quedan apiladas una arriba de la otra y la de arriba
// se desliza con el dedo o arrastrándola con el mouse. Hacia la izquierda pasa a la
// siguiente y hacia la derecha vuelve a la anterior.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Cuánto hay que arrastrar para que la tarjeta se vaya
const SWIPE_THRESHOLD = 70;
// Cuántas tarjetas se ven asomando detrás de la de arriba
const VISIBLE_BEHIND = 2;

export function TournamentDeck({
  items,
  label,
}: {
  items: Array<{ key: string; node: ReactNode; title: string }>;
  label: string;
}) {
  const [active, setActive] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Los datos del gesto van en una referencia para que el soltar lea siempre lo último
  const drag = useRef({ x: 0, y: 0, id: -1, on: false, moved: false });
  const justDragged = useRef(false);
  const count = items.length;
  const current = Math.min(active, count - 1);

  const go = (index: number) => setActive(Math.max(0, Math.min(count - 1, index)));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, on: true, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.on || event.pointerId !== state.id) return;
    const moveX = event.clientX - state.x;
    const moveY = event.clientY - state.y;
    if (!state.moved) {
      if (Math.abs(moveX) < 6 && Math.abs(moveY) < 6) return;
      // Si el gesto es más vertical, se deja scrollear la página
      if (Math.abs(moveY) > Math.abs(moveX)) {
        state.on = false;
        return;
      }
      state.moved = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Sin captura igual sigue el arrastre mientras el puntero esté encima
      }
    }
    // En la primera y la última la tarjeta se resiste un poco
    const atEdge = (moveX > 0 && current === 0) || (moveX < 0 && current === count - 1);
    setDx(atEdge ? moveX / 3 : moveX);
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.on || event.pointerId !== state.id) return;
    state.on = false;
    setDragging(false);
    if (state.moved) {
      justDragged.current = true;
      window.setTimeout(() => {
        justDragged.current = false;
      }, 0);
      const moveX = event.type === "pointercancel" ? 0 : event.clientX - state.x;
      if (moveX < -SWIPE_THRESHOLD) go(current + 1);
      else if (moveX > SWIPE_THRESHOLD) go(current - 1);
    }
    setDx(0);
  };

  return (
    <div role="region" aria-roledescription="carrusel" aria-label={label} className="flex flex-col gap-4">
      <div
        className="grid touch-pan-y select-none pt-7 [&>*]:[grid-area:1/1]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onDragStart={(event) => event.preventDefault()}
        // Si se arrastró, soltar no tiene que abrir el torneo
        onClickCapture={(event) => {
          if (!justDragged.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {items.map((item, index) => {
          const position = index - current;
          const top = position === 0;
          const gone = position < 0;
          const hidden = gone || position > VISIBLE_BEHIND;
          // Mientras se arrastra, la de atrás se va acomodando para ocupar el lugar
          const progress = Math.min(1, Math.abs(dx) / (SWIPE_THRESHOLD * 2));
          const depth = top ? 0 : Math.max(0, position - (position === 1 ? progress : 0));
          const transform = top
            ? `translateX(${dx}px) rotate(${dx / 22}deg)`
            : gone
              ? "translateX(-115%) rotate(-8deg)"
              : `translateY(${-Math.min(depth, VISIBLE_BEHIND) * 13}px) scale(${1 - Math.min(depth, VISIBLE_BEHIND) * 0.05})`;
          return (
            <div
              key={item.key}
              aria-hidden={!top}
              inert={!top}
              className={cn(
                "flex origin-top flex-col [&>article]:h-full",
                !(top && dragging) && "transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
                top && (dragging ? "cursor-grabbing" : "cursor-grab"),
              )}
              style={{
                transform,
                opacity: hidden ? 0 : top ? 1 : 1 - depth * 0.18,
                zIndex: count - Math.abs(position),
                pointerEvents: top ? "auto" : "none",
              }}
            >
              {item.node}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label="Torneo anterior"
            className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-primary hover:text-primary disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center">
            {items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                aria-label={`Ver ${item.title} (${index + 1} de ${count})`}
                aria-current={index === current}
                onClick={() => go(index)}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all",
                    index === current ? "w-5 bg-primary" : "w-2 bg-slate-600",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current === count - 1}
            aria-label="Torneo siguiente"
            className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-primary hover:text-primary disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        Torneo {current + 1} de {count}: {items[current]?.title}
      </p>
    </div>
  );
}
