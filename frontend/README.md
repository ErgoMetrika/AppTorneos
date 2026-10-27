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
```

El repositorio incluye `.env.example`. Para desarrollo local, completar `.env.local` con la URL y la anon key pública del proyecto. Nunca usar la `service_role` en el navegador.

## Vistas implementadas

- Inicio público y registro de usuarios generales.
- Login con Supabase Auth.
- Listado y detalle de torneos públicos.
- Equipos inscriptos y llave del torneo.
- Listado de equipos y detalle del plantel.
- Listado y ficha individual de jugadores para usuarios autenticados.
- Mi equipo en modo consulta para usuarios generales.
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

Las políticas RLS y funciones RPC siguen siendo la fuente de verdad. Los usuarios generales pueden consultar la información y, si ya tienen un equipo asignado, inscribirlo a un torneo. Las altas y modificaciones de equipos, jugadores y torneos requieren rol `admin`.

La migración `backend/supabase/migrations/20261027000001_admin_gestion.sql` revoca los flujos históricos de creación/unión de equipos para usuarios generales. Debe aplicarse al proyecto remoto con el flujo habitual de Supabase antes de publicar.
