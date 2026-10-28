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
Copy-Item ../backend/.env.example .env.local # PowerShell, solo la primera vez
pnpm dev
```

La conexión necesita estas variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TOURNAMENT_OWNER_COLUMN=false
```

El repositorio incluye `.env.example`. Para desarrollo local, completar `.env.local` con la URL y la anon key pública del proyecto. Nunca usar la `service_role` en el navegador.

## Vistas implementadas

- Inicio público y registro de usuarios generales.
- Login con Supabase Auth.
- Listado y detalle de torneos para usuarios autenticados.
- Equipos inscriptos y llave del torneo.
- Listado de equipos y detalle del plantel.
- Listado y ficha individual de jugadores para usuarios autenticados.
- Creación de equipos y unión mediante código para usuarios generales.
- Invitación de jugadores mediante el código del equipo.
- Inscripción del equipo a un torneo.
- Administración de torneos: alta y generación de llave.
- Administración de equipos: alta desde un modal y detalle de plantel.
- Administración de jugadores: alta, cambio de equipo/posición y baja.
- Contacto conectado a la tabla `contactos`.
- Mapa y acceso a Google Maps.

## Ajustes respecto del diseño

El frontend no muestra datos que el backend no guarda: escudos, dorsales, estado individual del jugador, notificaciones ni hora de inicio/finalización del torneo. Los equipos usan una marca tipográfica generada a partir del nombre y los jugadores muestran solamente nombre y posición.

## Validación

```bash
pnpm build
```

Las políticas RLS y funciones RPC siguen siendo la fuente de verdad. Los usuarios generales pueden crear un equipo, sumarse mediante código e inscribir su plantel a un torneo. La creación de torneos, generación de llaves y administración directa de jugadores continúan reservadas al rol `admin`.

El frontend ya contempla el futuro campo `torneos.user_id`. Mientras la columna no exista, `VITE_TOURNAMENT_OWNER_COLUMN` debe permanecer en `false`; después de aplicar la migración correspondiente en el backend se puede activar para enviar y recuperar el creador del torneo.
