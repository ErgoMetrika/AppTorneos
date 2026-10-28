# Torneos de Fútbol – Base de datos en Supabase

Proyecto Integrador – Programación 4 (UTN Haedo).
Web de torneos de fútbol 5 / 7 / 9 / 11 por **eliminación directa**.

Este repositorio contiene **solo la parte de datos**: el esquema, las reglas de negocio
y la seguridad, listos en Supabase para que el front se conecte directamente.
La guía concreta para conectar el front está en [docs/CONEXION_FRONT.md](docs/CONEXION_FRONT.md).

---

## 1. ¿Qué es Supabase y por qué lo usamos?

Supabase es una base de datos **PostgreSQL** en la nube que, además, te da gratis:

| Pieza | Qué hace | Qué reemplaza del proyecto original (PHP + MySQL) |
|---|---|---|
| **PostgreSQL** | La base de datos | MySQL |
| **Auth** | Registro, login, hash de contraseñas, sesiones (JWT) | `password_hash()` de PHP y las sesiones |
| **API REST automática** (PostgREST) | Cada tabla y vista queda disponible como endpoint `GET/POST/PATCH/DELETE` | Los archivos `.php` que hacían los `SELECT`/`INSERT` |
| **RPC** | Funciones SQL que se llaman desde el front | La lógica de validación que estaba en PHP |
| **RLS** (Row Level Security) | Reglas de quién puede ver/tocar cada fila | Los `if ($_SESSION['rol'] == 'admin')` de PHP |

Resultado: **no hay backend propio**. El front (JavaScript) habla con Supabase usando la
librería `@supabase/supabase-js`, y la base se encarga de validar y proteger los datos.

---

## 2. Estructura del repositorio

```
Proyecto Torneo/
├── schema.sql                     <- esquema original en MySQL (referencia)
├── erd_torneos_futbol_v3.html     <- diagrama entidad-relación
├── README.md                      <- este archivo (reglas de negocio)
├── docs/
│   └── CONEXION_FRONT.md          <- guía para el front: endpoints, ejemplos, errores
├── .env.example                   <- variables que necesita el front
└── supabase/
    ├── config.toml                <- configuración del proyecto Supabase
    ├── seed.sql                   <- datos de prueba (usuarios, equipos, torneos)
    └── migrations/
        ├── 20261021000001_esquema.sql     <- las 7 tablas + 2 vistas
        ├── 20261021000002_funciones.sql   <- reglas de negocio (RPC)
        ├── 20261021000003_seguridad.sql   <- políticas RLS
        ├── 20261029000004_codigos_admin.sql       <- el admin ve los códigos de equipo
        └── 20261029000005_codigo_solo_creador.sql <- solo el creador ve el código
```

Una **migración** es un archivo SQL numerado que se aplica una sola vez y en orden.
Así la base se puede recrear desde cero, igual, en cualquier proyecto Supabase.

---

## 3. Modelo de datos (7 tablas)

```
 auth.users (Supabase Auth)
     │ 1:1 (trigger al registrarse)
     ▼
 usuarios ──1:0..1── jugadores ──N:1── equipos
 (rol admin/general)   (posición)         │
                                          │ N:M (torneo_equipos)
                                          ▼
 contactos                            torneos ──1:N── partidos
 (formulario)                      (5/7/9/11, cupo,     (ronda, llave,
                                    público/privado)      goles, ganador,
                                                          partido_siguiente)
```

| Tabla | Para qué sirve | Claves / restricciones |
|---|---|---|
| `usuarios` | Perfil público del usuario: nombre, email, **rol** (`admin` / `general`). La contraseña **no** está acá: la guarda Supabase Auth con hash bcrypt. | `id` = mismo uuid que `auth.users`. Se crea solo con un trigger al registrarse. |
| `contactos` | Mensajes del formulario de contacto. | Cualquiera puede insertar; solo el admin los lee. |
| `torneos` | Torneo: tipo de fútbol (5/7/9/11), cupo (`max_equipos` 2/4/8/16), visibilidad, código de acceso si es privado, fecha, lugar, estado (`inscripcion` → `en_curso` → `finalizado`). | `CHECK` en tipo y cupo. El código privado se genera solo (trigger). |
| `equipos` | Equipo con nombre único y `codigo_equipo` de 6 letras para que otros se sumen. | El código se genera solo (`default`). No hay capitán. |
| `jugadores` | Relación usuario ↔ equipo con la posición. | `usuario_id UNIQUE` → un usuario está en **máximo 1 equipo**. `equipo_id NOT NULL` → un jugador siempre tiene equipo. |
| `torneo_equipos` | Inscripción de un equipo a un torneo. | PK compuesta `(torneo_id, equipo_id)` → no se puede inscribir dos veces. |
| `partidos` | Cada cruce de la llave: ronda, posición (`llave`), equipos, goles, penales, ganador y a qué partido avanza el ganador. | `UNIQUE (torneo_id, ronda, llave)`. Equipos en `NULL` hasta que se resuelva la ronda anterior. |

**Vistas** (consultas guardadas, de solo lectura):

- `v_equipo_plantel`: cada equipo con su cantidad de jugadores.
- `v_llave`: los partidos con los **nombres** de los equipos ya resueltos, listos para dibujar el cuadro.

---

## 4. Reglas de negocio

Cada regla vive en una **función SQL** (`supabase/migrations/20261021000002_funciones.sql`).
El front las llama con `supabase.rpc('nombre', { parámetros })`. Si una regla no se cumple,
la función corta con un error en castellano que el front muestra tal cual.

### 4.1 Usuarios y roles

- Hay **dos niveles**: `general` (jugador / visitante logueado) y `admin`.
- Al registrarse con email y contraseña, Supabase Auth guarda el hash y un trigger
  crea el perfil en `usuarios` con rol `general`.
- Un usuario puede ser admin **sin** ser jugador.
- Nadie puede cambiarse el rol a sí mismo; solo un admin puede cambiar el rol de otro
  (trigger `trg_proteger_rol_usuario`).

### 4.2 Equipos

| Acción | Función | Reglas |
|---|---|---|
| Crear equipo | `crear_equipo(nombre, posicion)` | Hay que estar logueado. No se puede estar ya en otro equipo. El nombre es único (mín. 3 caracteres). El creador queda como primer jugador. Devuelve el equipo **con su código** para compartir. |
| Unirse a un equipo | `unirse_a_equipo(codigo, posicion)` | Hay que estar logueado. No se puede estar ya en otro equipo. El código tiene que existir. |
| Ver mi equipo | `mi_equipo()` | Devuelve mi equipo y el plantel completo. El `codigo_equipo` lo recibe **solo el creador** del equipo (el primer jugador que entró); el resto recibe `null` en `codigo_equipo` y `soy_creador: false`. La columna está oculta en las consultas directas. |
| Ver códigos (admin) | `codigos_de_equipos()` | Solo el administrador: devuelve el código de cada equipo. |
| Salir del equipo | `DELETE` en `jugadores` (fila propia) | Solo si el equipo **no está compitiendo** (no está inscripto en un torneo sin finalizar). |

### 4.3 Torneos

- Solo el **admin** crea, edita y borra torneos (política RLS).
- `tipo_futbol` ∈ {5, 7, 9, 11} y `max_equipos` ∈ {2, 4, 8, 16} (potencias de 2 para
  que la llave cierre sin equipos "libres").
- Un torneo **público** lo ve cualquiera, incluso sin login.
- Un torneo **privado** solo lo ve el admin y los equipos ya inscriptos. Quien tenga el
  código lo encuentra con `buscar_torneo_privado(codigo)`.
- El `codigo_acceso` de un torneo privado se genera solo al crearlo (6 caracteres).

### 4.4 Inscripción – `inscribir_equipo(torneo_id, equipo_id, codigo_acceso)`

La regla más importante. Se valida todo esto, en orden:

1. El que inscribe está logueado y **es jugador de ese equipo**.
2. El torneo está en estado `inscripcion`.
3. Hay cupo: inscriptos `<` `max_equipos`.
4. El equipo tiene **plantel mínimo**: jugadores `>=` `tipo_futbol + 2`
   (titulares + 2 suplentes). Ej.: fútbol 5 → 7 jugadores.
5. Si el torneo es privado, el `codigo_acceso` coincide.
6. El equipo no está ya inscripto (lo garantiza la PK compuesta).

La fila del torneo se bloquea durante la operación (`FOR UPDATE`) para que dos equipos
no ocupen el último cupo al mismo tiempo.

### 4.5 Llave – `generar_llave(torneo_id)` (solo admin)

- El torneo debe estar en `inscripcion` y sin partidos generados.
- Los inscriptos deben ser **2, 4, 8 o 16** (potencia de 2).
- Se **sortean** al azar los equipos de la ronda 1.
- Se crean vacíos los partidos de las rondas siguientes y se enlazan:
  el partido `(ronda r, llave k)` manda a su ganador al partido `(ronda r+1, llave ⌈k/2⌉)`;
  si `k` es impar entra como `local`, si es par como `visitante`.
- El torneo pasa a `en_curso`.

```
 Ejemplo con 4 equipos (2 rondas):

 Ronda 1               Ronda 2 (final)
 llave 1: A vs B ──┐
                   ├──► llave 1: ganador(1) vs ganador(2)
 llave 2: C vs D ──┘    (local = llave impar, visitante = llave par)
```

### 4.6 Resultado – `cargar_resultado(partido_id, goles_local, goles_visitante, penales_local, penales_visitante)` (solo admin)

- El partido tiene que tener los dos equipos definidos y no estar finalizado.
- **Goles distintos** → gana el que hizo más goles.
- **Empate** → los penales son obligatorios y no pueden empatar. Si no hubo empate, los penales quedan en `NULL`.
- El partido pasa a `finalizado` y el ganador se **copia automáticamente** al partido
  siguiente, en el lado que indica `lado_siguiente`.
- Si no hay partido siguiente, era la **final**: el torneo pasa a `finalizado`.

### 4.7 Contacto

- Cualquiera, incluso sin login, puede enviar el formulario (`INSERT` en `contactos`).
- Solo el admin lee los mensajes.
  (El envío de mail que hacía PHP con `mail()` no es parte de la base; si se quiere,
  se resuelve desde el front o con una Edge Function más adelante.)

---

## 5. Seguridad (RLS) – resumen

| Tabla | Visitante (`anon`) | Logueado (`authenticated`) | Admin |
|---|---|---|---|
| `usuarios` | – | Lee todos. Edita su nombre. | Todo (incl. cambiar roles) |
| `contactos` | Inserta | Inserta | Lee / borra |
| `torneos` | Lee públicos | Lee públicos + privados donde está inscripto | Todo |
| `equipos` | Lee (sin código) | Lee (sin código). Crea vía `crear_equipo()` | Todo |
| `jugadores` | Lee | Lee. Entra vía funciones. Borra su propia fila si el equipo no compite | Todo |
| `torneo_equipos` | Lee | Lee. Inscribe vía `inscribir_equipo()` | Todo |
| `partidos` | Lee | Lee | Todo (vía `generar_llave()` / `cargar_resultado()`) |

Las funciones son `SECURITY DEFINER`: corren con permisos del dueño de la base, por eso
pueden escribir donde el usuario no puede directo, pero **cada una valida quién la llama**
con `auth.uid()` y `es_admin()`.

---

## 6. Datos de prueba (`supabase/seed.sql`)

Mismos datos que el `schema.sql` original. Contraseña de todos: **`123456`**.

| Usuario | Email | Rol | Equipo |
|---|---|---|---|
| Admin | `admin@torneos.com` | admin | – |
| Lucas, Sofia, Mateo, Valen, Franco, Cami, Nico | `lucas@mail.com`, … | general | Los Pibes (código `PIBES1`) |
| Agus, Tomi, Juanma, Santi, Fede, Ramiro, Lautaro | `agus@mail.com`, … | general | Atlético Ramos (código `RAMOS2`) |

Torneos: **Copa Fútbol 5 – Abierta** (pública, cupo 4, con los dos equipos ya inscriptos) y
**Copa Fútbol 7 – Clubes** (privada, código `A7K2PQ`, cupo 8, sin inscriptos).

**Recorrido de demostración completo** (con el admin):
1. `generar_llave(1)` → se crea la final Los Pibes vs Atlético Ramos, torneo `en_curso`.
2. `cargar_resultado(id_partido, 2, 2, 4, 3)` → empate, define por penales, torneo `finalizado`.
3. `select * from v_llave where torneo_id = 1` → cuadro con nombres y ganador.

---

## 7. El proyecto en Supabase

La base **ya está desplegada** con migraciones y seed aplicados:

| Dato | Valor |
|---|---|
| Proyecto | `torneos-futbol` (organización "Proyecto Facultad", plan Free) |
| Panel | https://supabase.com/dashboard/project/rcdnticmpjhiajjmoivo |
| URL de la API | `https://rcdnticmpjhiajjmoivo.supabase.co` |
| Región | São Paulo (`sa-east-1`) |
| anon key | en `.env.example` (es pública) |

Las credenciales para el front están en `.env.example`. La contraseña de la base de datos
(solo hace falta para la CLI) la tiene Julián; se puede cambiar desde
*Project Settings → Database → Reset database password*.

### La app publicada (Vercel)

El front está publicado en **https://app-torneos-three.vercel.app** (proyecto `app-torneos`
en Vercel, plan Hobby gratis). Vercel está conectado a este repositorio:

- Cada push a `main` publica una versión nueva sola, en alrededor de un minuto.
- Vercel compila solo la carpeta `frontend`. Los cambios de la base **no** los aplica Vercel:
  una migración nueva hay que aplicarla con `npx supabase db push` desde `backend`.

### Cómo se volvería a crear desde cero

Requisitos: Node.js (la CLI se corre con `npx`, no hace falta instalar nada más).

```bash
# 1. Iniciar sesión en Supabase (abre el navegador)
npx supabase login

# 2. Vincular esta carpeta con el proyecto (pide la contraseña de la base)
npx supabase link --project-ref rcdnticmpjhiajjmoivo

# 3. Aplicar las migraciones (crea tablas, funciones y políticas)
npx supabase db push

# 4. Cargar los datos de prueba
npx supabase db push --include-seed
```

Para empezar de cero en el mismo proyecto: `npx supabase db reset --linked`
(**borra todo** y vuelve a aplicar migraciones + seed).

### Cómo se probó

- En local, con un PostgreSQL 17 compilado a WASM (PGlite): migraciones, seed y 45 casos
  del recorrido completo (visitante, jugador, registro nuevo, admin, llave de 2 y de 8 equipos).
- En la nube, por la API REST con la anon key: listado como visitante, login, `mi_equipo`,
  validaciones de inscripción, permisos de admin y registro de un usuario nuevo (borrado después).
