// Mazo de tarjetas para celu: quedan apiladas una arriba de la otra y la de arriba
// se desliza con el dedo o arrastrándola con el mouse, para cualquiera de los dos lados.
// La que se saca sale hacia ese lado y vuelve a meterse abajo de todo, así el mazo da la vuelta.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Cuánto hay que arrastrar para que la tarjeta se vaya
const SWIPE_THRESHOLD = 70;
// Cuántas tarjetas se ven asomando detrás de la de arriba
const VISIBLE_BEHIND = 2;
// Cuánto tarda la tarjeta en salir antes de meterse abajo del mazo
const THROW_MS = 260;

type Thrown = { key: string; dir: 1 | -1 };

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
  // La tarjeta que se acaba de sacar: primero sale volando y después se mete abajo
  const [thrown, setThrown] = useState<Thrown | null>(null);
  // Los datos del gesto van en una referencia para que el soltar lea siempre lo último
  const drag = useRef({ x: 0, y: 0, id: -1, on: false, moved: false });
  const justDragged = useRef(false);
  const throwTimer = useRef<number | undefined>(undefined);
  const count = items.length;
  const current = ((active % count) + count) % count;

  useEffect(() => () => window.clearTimeout(throwTimer.current), []);

  // Saca la de arriba hacia un lado y pasa a la siguiente
  const next = (dir: 1 | -1) => {
    if (count < 2) return;
    const top = items[current];
    if (top) setThrown({ key: top.key, dir });
    setActive((value) => value + 1);
    window.clearTimeout(throwTimer.current);
    throwTimer.current = window.setTimeout(() => setThrown(null), THROW_MS);
  };
  // Trae arriba la que estaba abajo de todo
  const previous = () => {
    if (count < 2) return;
    setThrown(null);
    setActive((value) => value - 1);
  };

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
    setDx(count < 2 ? moveX / 3 : moveX);
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.on || event.pointerId !== state.id) return;
    state.on = false;
    setDragging(false);
    setDx(0);
    if (!state.moved) return;
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
    const moveX = event.type === "pointercancel" ? 0 : event.clientX - state.x;
    // Para cualquiera de los dos lados pasa a la siguiente
    if (Math.abs(moveX) > SWIPE_THRESHOLD) next(moveX > 0 ? 1 : -1);
  };

  const progress = Math.min(1, Math.abs(dx) / (SWIPE_THRESHOLD * 2));

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
          // 0 es la de arriba; 1, 2... las que siguen debajo
          const position = (index - current + count) % count;
          const top = position === 0;
          const flying = thrown?.key === item.key;
          // Mientras se arrastra, la de abajo se va acomodando para ocupar el lugar
          const depth = top ? 0 : Math.max(0, position - (position === 1 ? progress : 0));
          const shown = Math.min(depth, VISIBLE_BEHIND);
          const transform = top
            ? `translateX(${dx}px) rotate(${dx / 22}deg)`
            : flying
              ? `translateX(${thrown.dir * 115}%) rotate(${thrown.dir * 10}deg)`
              : `translateY(${-shown * 13}px) scale(${1 - shown * 0.05})`;
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
                opacity: flying || top ? 1 : position > VISIBLE_BEHIND ? 0 : 1 - shown * 0.18,
                // Mientras sale queda por encima de todo; después se mete abajo del mazo
                zIndex: flying ? count + 1 : count - position,
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
            onClick={previous}
            aria-label="Torneo anterior"
            className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-primary hover:text-primary"
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
                onClick={() => {
                  setThrown(null);
                  setActive(index);
                }}
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
            onClick={() => next(-1)}
            aria-label="Torneo siguiente"
            className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-primary hover:text-primary"
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
