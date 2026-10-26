# Torneo 90 — frontend

Aplicación web para el backend Supabase de `app-torneos-backend`. El frontend toma la dirección visual del prototipo de Pen y la adapta al modelo de datos real.

## Stack

- Vite + React + TypeScript
- pnpm
- Tailwind CSS 4 + DaisyUI
- componentes base estilo shadcn/ui
- React Router
- TanStack Query
- React Hook Form + Zod
- Supabase JS
- Lucide React
- date-fns

## Inicio rápido

```bash
pnpm install
pnpm dev
```

La conexión necesita estas variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

El repositorio incluye `.env.example`. Para desarrollo local, completar `.env.local` con la URL y la anon key pública del proyecto. Nunca usar la `service_role` en el navegador.

## Vistas implementadas

- Inicio público y registro de usuarios generales.
- Login con Supabase Auth.
- Listado y detalle de torneos públicos.
- Equipos inscriptos y llave del torneo.
- Listado de equipos y detalle del plantel.
- Mi equipo: crear o unirse mediante código.
- Inscripción del equipo a un torneo.
- Creación de torneos para administradores.
- Contacto conectado a la tabla `contactos`.
- Mapa y acceso a Google Maps.

## Ajustes respecto del diseño

El frontend no muestra datos que el backend no guarda: escudos, dorsales, estado individual del jugador, notificaciones ni hora de inicio/finalización del torneo. Los equipos usan una marca tipográfica generada a partir del nombre y los jugadores muestran solamente nombre y posición.

## Validación

```bash
pnpm build
```

Las políticas RLS y funciones RPC siguen siendo la fuente de verdad. Las operaciones sensibles —crear equipo, unirse, inscribir y generar códigos— se ejecutan a través de Supabase según el contrato documentado en `app-torneos-backend/docs/CONEXION_FRONT.md`.
