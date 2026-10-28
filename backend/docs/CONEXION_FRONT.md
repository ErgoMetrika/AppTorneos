# Guía de conexión para el front

Todo lo que el front necesita para hablar con la base: cómo conectarse, qué "endpoints"
hay y cómo se llama cada regla de negocio. Las reglas en sí están explicadas en el
[README](../README.md).

---

## 1. Conexión

```bash
npm install @supabase/supabase-js
```

```js
// src/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Los valores van en un `.env` (ver `.env.example`). La `anon key` **es pública**: la
seguridad no depende de ocultarla sino de las políticas RLS de la base.

Todas las llamadas devuelven `{ data, error }`. Si `error` no es `null`, el mensaje para
el usuario está en `error.message` (las funciones devuelven mensajes en castellano).

---

## 2. Cómo funcionan los "endpoints"

Supabase expone **automáticamente** una API REST para cada tabla y vista.
No hay que programar endpoints: la librería arma las llamadas HTTP por nosotros.

| Lo que escribís en JS | Lo que viaja por HTTP |
|---|---|
| `supabase.from('torneos').select('*')` | `GET /rest/v1/torneos?select=*` |
| `supabase.from('contactos').insert({...})` | `POST /rest/v1/contactos` |
| `supabase.from('torneos').update({...}).eq('id', 1)` | `PATCH /rest/v1/torneos?id=eq.1` |
| `supabase.rpc('inscribir_equipo', {...})` | `POST /rest/v1/rpc/inscribir_equipo` |

En cada llamada viaja el token del usuario logueado (lo maneja la librería), y la base
aplica las políticas RLS según quién sea.

**Dos tipos de operaciones:**

- **Lecturas y escrituras simples** → directo sobre la tabla con `.from()`.
- **Reglas de negocio** (crear equipo, unirse, inscribirse, generar llave, cargar resultado)
  → funciones con `.rpc()`. Insertar directo en esas tablas está bloqueado a propósito.

---

## 3. Autenticación

```js
// Registro: el nombre viaja en options.data y el trigger lo copia a la tabla usuarios
const { data, error } = await supabase.auth.signUp({
  email: 'lucas@mail.com',
  password: '123456',
  options: { data: { nombre: 'Lucas' } }
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'lucas@mail.com',
  password: '123456'
})

// Logout
await supabase.auth.signOut()

// Sesión actual (null si no está logueado)
const { data: { session } } = await supabase.auth.getSession()

// Reaccionar a login / logout
supabase.auth.onAuthStateChange((evento, session) => { /* actualizar la UI */ })
```

**Perfil y rol del usuario logueado:**

```js
const { data: { user } } = await supabase.auth.getUser()

const { data: perfil } = await supabase
  .from('usuarios')
  .select('id, nombre, email, rol')
  .eq('id', user.id)
  .single()

// perfil.rol === 'admin' -> mostrar menú de administración
```

Atajo para saber si es admin: `const { data: esAdmin } = await supabase.rpc('es_admin')`.

---

## 4. Endpoints por pantalla

### 4.1 Público (sin login)

**Listado de torneos** (solo públicos; los privados no aparecen):

```js
const { data } = await supabase
  .from('torneos')
  .select('id, nombre, descripcion, tipo_futbol, max_equipos, visibilidad, fecha, lugar, estado, torneo_equipos(count)')
  .order('fecha')
// data[i].torneo_equipos[0].count = cantidad de inscriptos
```

**Detalle de un torneo con sus equipos inscriptos:**

```js
const { data } = await supabase
  .from('torneos')
  .select('*, torneo_equipos(inscripto_en, equipos(id, nombre))')
  .eq('id', torneoId)
  .single()
```

**Llave / cuadro del torneo** (vista con los nombres ya resueltos):

```js
const { data } = await supabase
  .from('v_llave')
  .select('*')
  .eq('torneo_id', torneoId)
// Agrupar por `ronda` y ordenar por `llave` para dibujar el cuadro.
// Campos: local, visitante, goles_local, goles_visitante, penales_*, ganador, estado, fecha
```

**Equipos y plantel:**

```js
// OJO: equipos NO acepta select('*') porque codigo_equipo está oculto. Pedir columnas.
const { data } = await supabase.from('v_equipo_plantel').select('*')

const { data } = await supabase
  .from('equipos')
  .select('id, nombre, jugadores(posicion, usuarios(nombre))')
  .eq('id', equipoId)
  .single()
```

**Formulario de contacto:**

```js
const { error } = await supabase
  .from('contactos')
  .insert({ nombre, email, mensaje })
```

### 4.2 Usuario logueado (rol `general`)

**Mi equipo** (código incluido; `data` es `null` si no tiene equipo):

```js
const { data: miEquipo } = await supabase.rpc('mi_equipo')
// { id, nombre, codigo_equipo, mi_posicion, jugadores: [{ nombre, posicion, ... }] }
```

**Crear equipo** (el creador queda como primer jugador):

```js
const { data: equipo, error } = await supabase.rpc('crear_equipo', {
  p_nombre: 'Los Pibes',
  p_posicion: 'arquero'          // arquero | defensor | mediocampista | delantero
})
// equipo.codigo_equipo -> mostrarlo para que lo compartan
```

**Unirse a un equipo con código:**

```js
const { error } = await supabase.rpc('unirse_a_equipo', {
  p_codigo: 'PIBES1',
  p_posicion: 'delantero'
})
```

**Salir del equipo** (solo si el equipo no está compitiendo):

```js
const { error } = await supabase
  .from('jugadores')
  .delete()
  .eq('usuario_id', user.id)
```

**Buscar un torneo privado por código:**

```js
const { data } = await supabase.rpc('buscar_torneo_privado', { p_codigo: 'A7K2PQ' })
// data = [torneo] o [] si el código no existe
```

**Inscribir mi equipo a un torneo:**

```js
const { error } = await supabase.rpc('inscribir_equipo', {
  p_torneo_id: 1,
  p_equipo_id: miEquipo.id,
  p_codigo_acceso: 'A7K2PQ'      // omitir o null si el torneo es público
})
// error.message posibles:
//  "El torneo ya no acepta inscripciones."
//  "El torneo ya tiene el cupo completo (4 equipos)."
//  "El equipo necesita al menos 7 jugadores para fútbol 5 (tiene 5)."
//  "El código de acceso del torneo es incorrecto."
//  "El equipo ya está inscripto en este torneo."
//  "Solo un jugador del equipo puede inscribirlo."
```

**Editar mi nombre:**

```js
await supabase.from('usuarios').update({ nombre: 'Lucas G.' }).eq('id', user.id)
```

### 4.3 Administrador (rol `admin`)

**Crear / editar / borrar torneos** (directo sobre la tabla):

```js
const { data, error } = await supabase.from('torneos').insert({
  nombre: 'Copa Fútbol 5 - Abierta',
  descripcion: 'Torneo abierto de fútbol 5',
  tipo_futbol: 5,                // 5 | 7 | 9 | 11
  max_equipos: 4,                // 2 | 4 | 8 | 16
  visibilidad: 'publico',        // publico | privado (el código se genera solo)
  fecha: '2026-11-15',
  lugar: 'Complejo El Potrero'
}).select().single()
// data.codigo_acceso -> si es privado, acá está el código para repartir

await supabase.from('torneos').update({ lugar: 'Otro lugar' }).eq('id', 1)
await supabase.from('torneos').delete().eq('id', 1)
```

**Dar de baja una inscripción:**

```js
await supabase.from('torneo_equipos').delete().match({ torneo_id: 1, equipo_id: 2 })
```

**Generar la llave** (sortea y crea todos los partidos, torneo pasa a `en_curso`):

```js
const { data: partidos, error } = await supabase.rpc('generar_llave', { p_torneo_id: 1 })
// error.message posibles:
//  "Para armar la llave hacen falta 2, 4, 8 o 16 equipos inscriptos (hay 3)."
//  "El torneo ya tiene partidos generados."
```

**Poner fecha a un partido:**

```js
await supabase.from('partidos').update({ fecha: '2026-11-15T18:00:00-03:00' }).eq('id', partidoId)
```

**Cargar un resultado** (define ganador, lo avanza a la siguiente ronda, cierra el torneo si era la final):

```js
const { data: partido, error } = await supabase.rpc('cargar_resultado', {
  p_partido_id: 10,
  p_goles_local: 2,
  p_goles_visitante: 2,
  p_penales_local: 4,            // solo si hubo empate
  p_penales_visitante: 3
})
// error.message posibles:
//  "Hubo empate: hay que cargar los penales."
//  "Los penales no pueden terminar empatados."
//  "El partido todavía no tiene los dos equipos definidos."
```

**Leer mensajes de contacto:**

```js
const { data } = await supabase.from('contactos').select('*').order('creado_en', { ascending: false })
```

**Cambiar el rol de un usuario:**

```js
await supabase.from('usuarios').update({ rol: 'admin' }).eq('email', 'sofia@mail.com')
```

---

## 5. Resumen rápido de funciones RPC

| Función | Quién | Parámetros | Devuelve |
|---|---|---|---|
| `es_admin` | cualquiera | – | `boolean` |
| `mi_equipo` | logueado | – | objeto JSON con equipo, plantel y `soy_creador`; el código solo si sos el creador (o `null`) |
| `codigos_de_equipos` | admin | – | lista de `{ equipo_id, codigo_equipo }` |
| `crear_equipo` | logueado sin equipo | `p_nombre`, `p_posicion` | fila de `equipos` (con `codigo_equipo`) |
| `unirse_a_equipo` | logueado sin equipo | `p_codigo`, `p_posicion` | fila de `jugadores` |
| `buscar_torneo_privado` | logueado | `p_codigo` | lista de `torneos` |
| `inscribir_equipo` | jugador del equipo | `p_torneo_id`, `p_equipo_id`, `p_codigo_acceso?` | fila de `torneo_equipos` |
| `generar_llave` | admin | `p_torneo_id` | lista de `partidos` |
| `cargar_resultado` | admin | `p_partido_id`, `p_goles_local`, `p_goles_visitante`, `p_penales_local?`, `p_penales_visitante?` | fila de `partidos` |

Valores de los enumerados:

- `posicion`: `arquero` · `defensor` · `mediocampista` · `delantero`
- `estado` de torneo: `inscripcion` · `en_curso` · `finalizado`
- `estado` de partido: `pendiente` · `en_curso` · `finalizado`
- `visibilidad`: `publico` · `privado`
- `rol`: `admin` · `general`

---

## 6. Cosas a tener en cuenta

- **`equipos` no acepta `select('*')`**: la columna `codigo_equipo` está oculta. Pedir
  `id, nombre, creado_en` o usar `v_equipo_plantel`.
- **Un usuario está en un solo equipo**: antes de mostrar "crear equipo" / "unirse",
  consultar `mi_equipo()`; si devuelve algo, mostrar "mi equipo".
- **Los torneos privados no aparecen en el listado**: hay que ofrecer un campo
  "Ingresar código de torneo" que llame a `buscar_torneo_privado`.
- **Admin**: en el seed ya existe `admin@torneos.com` / `123456`. Para hacer admin a
  otro usuario, el admin actualiza su `rol` (o se hace desde el SQL Editor de Supabase).
- **Fechas**: `torneos.fecha` es `date` (`'2026-11-15'`); `partidos.fecha` es `timestamptz`
  (`'2026-11-15T18:00:00-03:00'`).
- **Tiempo real** (opcional): si se quiere que la llave se actualice sola, se puede activar
  Realtime sobre `partidos` en el panel de Supabase y usar `supabase.channel(...)`.
