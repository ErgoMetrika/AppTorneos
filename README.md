# Torneo 90'

Proyecto Integrador – Programación 4 (UTN Haedo).
Web de torneos de fútbol 5 / 7 / 9 / 11 por eliminación directa.

- **App publicada:** https://app-torneos-three.vercel.app
- **Video de presentación:** _(link pendiente)_
- **Guion y resumen del proyecto:** [Torneo90-Guion.pdf](Torneo90-Guion.pdf) · [Torneo90-Resumen.pdf](Torneo90-Resumen.pdf)

---

## Qué hay en este repositorio

| Carpeta / archivo | Qué es |
|---|---|
| [frontend/](frontend/) | La página web (React + TypeScript + Vite) |
| [backend/](backend/) | La base de datos (Supabase / PostgreSQL) |
| [backend/Torneo90_base_de_datos_completa.sql](backend/Torneo90_base_de_datos_completa.sql) | **Exportación de la base**: tablas, funciones, seguridad y datos de prueba en un solo archivo |
| [backend/supabase/migrations/](backend/supabase/migrations/) | La misma base, separada en los pasos en que se fue armando |
| [backend/erd_torneos_futbol_v3.html](backend/erd_torneos_futbol_v3.html) | Diagrama entidad-relación (bajarlo y abrirlo con el navegador) |
| [backend/schema.sql](backend/schema.sql) | Primera versión del esquema en MySQL (solo como referencia) |
| [USUARIOS_Y_CLAVES.txt](USUARIOS_Y_CLAVES.txt) | Usuarios y contraseñas de cada tipo de usuario |

---

## Tecnologías utilizadas

**Base de datos y servidor**
- **Supabase**: base de datos PostgreSQL en la nube, con login de usuarios, API automática y reglas de seguridad por fila (RLS). Reemplaza al servidor PHP + MySQL: no hay un backend propio.
- **PostgreSQL**: tablas, funciones y triggers con las reglas del negocio.

**Frontend**
- **React 19** y **TypeScript**: la interfaz.
- **Vite**: servidor de desarrollo y compilación.
- **Tailwind CSS 4** y **daisyUI**: estilos.
- **React Router**: navegación entre páginas.
- **TanStack Query**: carga de datos desde Supabase.
- **React Hook Form** y **Zod**: formularios y validaciones.
- **supabase-js**: conexión con Supabase.
- **Radix UI, lucide-react, sonner, date-fns**: ventanas, íconos, avisos y fechas.

**Publicación**
- **Vercel**: hosting gratuito de la página.
- **GitHub**: este repositorio.

---

## Cómo levantar el proyecto

**Requisito:** [Node.js](https://nodejs.org) 22 o superior (versión LTS). Trae `npm` incluido.
No hace falta XAMPP, PHP ni MySQL.

1. Bajar el proyecto: botón verde **Code → Download ZIP** y descomprimir
   (o `git clone https://github.com/ErgoMetrika/AppTorneos.git`).
2. Copiar el archivo `backend/.env.example` dentro de la carpeta `frontend` y renombrarlo a `.env`.
3. Abrir una terminal en la carpeta `frontend` y correr:
   ```
   npm install
   npm run dev
   ```
4. Abrir la dirección que muestra la terminal (normalmente http://localhost:5173).

Para generar la versión final: `npm run build`.

---

## La base de datos

La base **no se instala en la compu**: está en la nube, en Supabase. La app ya viene conectada,
así que con los pasos de arriba ya se ven los mismos torneos y usuarios que en la página publicada.

### ¿Hacen falta claves?

Para conectarse se usan dos datos **públicos** que ya vienen en `backend/.env.example`:

```
VITE_SUPABASE_URL=https://rcdnticmpjhiajjmoivo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZG50aWNtcGpoaWFqam1vaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwNDQsImV4cCI6MjEwODIwNTA0NH0.EpFJ41NMbBrrSGo7hxVDXQhpjxGYcDSGd_JPwbfmgcI
```

La *anon key* es como la dirección de la base: sirve para llegar, pero no da permisos.
Lo que cada uno puede ver o cambiar lo deciden las **reglas de seguridad de la base (RLS)**.
Por ejemplo, un visitante ve los torneos públicos, pero no puede leer los mails de los usuarios
ni cargar resultados.

Lo que **nunca** se comparte (y no está en este repo): la contraseña de la base y la
*service_role key*, que saltea todas las reglas.

### Tres formas de usarla

**A) Usar la app.** Entrar con los usuarios de [USUARIOS_Y_CLAVES.txt](USUARIOS_Y_CLAVES.txt).
Con `admin@torneos.com` se ve la administración: crear torneos, generar la llave, cargar resultados
y leer las consultas de Contacto. Todo se guarda en la base en el momento.

**B) Ver nuestra base por dentro.** Si nos pasa un mail, lo invitamos al proyecto de Supabase.
Desde el panel se ven las tablas y sus datos (*Table Editor*), se pueden hacer consultas
(*SQL Editor*), ver los usuarios (*Authentication*) y las reglas de seguridad (*Database → Policies*).

**C) Levantar una copia propia desde cero** (unos 5 minutos):
1. Crear una cuenta gratis en https://supabase.com y un proyecto nuevo (región *South America (São Paulo)*).
2. Ir a **SQL Editor → New query**.
3. Abrir [backend/Torneo90_base_de_datos_completa.sql](backend/Torneo90_base_de_datos_completa.sql),
   copiar todo, pegarlo y tocar **Run**. Crea las 7 tablas, las funciones, las reglas de seguridad
   y los mismos usuarios de prueba.
4. Para registrar usuarios nuevos sin confirmar el mail:
   **Authentication → Sign In / Providers → Email** y desactivar *Confirm email*.
5. En **Project Settings → API Keys** copiar la *Project URL* y la *anon public key*,
   y ponerlas en `frontend/.env` en lugar de las nuestras.
6. `npm run dev`: la app ahora usa la base nueva.

### Consultas de prueba (para pegar en el SQL Editor)

```sql
-- Todos los torneos
select id, nombre, tipo_futbol, visibilidad, estado from torneos;

-- Cada equipo con cuántos jugadores tiene
select e.nombre, count(j.id) as jugadores
from equipos e left join jugadores j on j.equipo_id = e.id
group by e.nombre;

-- Qué equipos están inscriptos en cada torneo
select t.nombre as torneo, e.nombre as equipo
from torneo_equipos te
join torneos t on t.id = te.torneo_id
join equipos e on e.id = te.equipo_id;

-- Consultas que llegaron desde Contacto
select nombre, email, mensaje, creado_en from contactos;

-- Usuarios y su rol
select nombre, email, rol from usuarios;
```

Las reglas del negocio están en la base y no solo en la pantalla. Por ejemplo, si un jugador
común intenta cargar un resultado o inscribir un equipo incompleto, la base lo rechaza aunque
se intente por afuera de la página.

Más detalle técnico: [backend/README.md](backend/README.md) y
[backend/docs/CONEXION_FRONT.md](backend/docs/CONEXION_FRONT.md).

---

## Usuarios de prueba

Todos tienen la contraseña **123456**. Lista completa en [USUARIOS_Y_CLAVES.txt](USUARIOS_Y_CLAVES.txt).

| Tipo | Email |
|---|---|
| Administrador general | admin@torneos.com |
| Administrador de equipo (capitán) | lucas@mail.com (Los Pibes) · agus@mail.com (Atlético Ramos) |
| Jugador | sofia@mail.com, mateo@mail.com, tomi@mail.com, … |
| Visitante | No necesita cuenta |

Torneo privado de prueba: *Copa Fútbol 7 - Clubes*, código **A7K2PQ**.
