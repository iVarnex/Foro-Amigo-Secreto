# 0001 — Stack inicial y decisiones de autorización

- **Estado**: Aceptado
- **Fecha**: 2026-09-15

## Contexto

El proyecto es un foro anónimo (fichas de Amigo Secreto / Amigo Dulce +
comentarios) con un panel de administración separado para moderar contenido.
Restricciones reales al momento de decidir:

- Ya existía una cuenta de Vercel, sin base de datos ni proveedor de auth
  provisionados (`PLANIFICACION.md`).
- El contenido anónimo (fichas, comentarios) no tiene login: cualquiera
  publica sin cuenta, pero necesita poder editar o borrar lo suyo después.
- El panel de administración es de una sola cuenta (no hay alta pública de
  admins) y debe exigir 2FA.
- Se quería poder testear los route handlers de la API con el runner nativo
  de Node (`node --test`, ver `package.json` → script `test`), sin levantar
  un servidor Next real.

## Decisión

### Next.js (App Router) + Vercel

Se usa Next.js 16 con App Router, desplegado en Vercel, en un solo repo para
UI + API routes (`app/api/**`). Ya había cuenta de Vercel, así que no se
evaluaron otros hostings.

### Neon Postgres vía Drizzle

La base es Neon Postgres (`@neondatabase/serverless`), accedida con Drizzle
ORM (`drizzle-orm`, `drizzle-kit`). `db/index.ts` abre la conexión de forma
perezosa (`getDb()`) a partir de `DATABASE_URL`. El esquema (`db/schema.ts`)
modela `fichas` y `comentarios` como una relación 1→N clásica, con
`ON DELETE CASCADE` en `comentarios.ficha_id`.

### Clerk para la cuenta de administración, con 2FA

`@clerk/nextjs` gestiona la sesión de admin. La decisión de diseño relevante
no es solo "usar Clerk", sino **dónde se exige la autorización**:

- `proxy.ts` (ver más abajo) monta `clerkMiddleware()` pero **no decide quién
  entra** — solo deja `auth()` disponible para las rutas de `/admin/*` y
  `/api/admin/*`. El comentario en ese archivo documenta por qué: los
  helpers `createRouteMatcher` + `auth.protect()` de Clerk están deprecados
  en Clerk Core 3, y el matcheo por ruta puede divergir del enrutado real de
  Next.
- La autorización real vive en `lib/autorizacion-admin.ts` (reglas puras, sin
  Clerk) y `lib/auth.ts` (puente con Clerk), y se ejecuta en cada punto que
  toca el dato: `app/admin/page.tsx` y cada handler de `/api/admin/*` llaman
  a `verificarAccesoAdmin()` / `exigirAdminEnApi()`.
- El admin es una allowlist de una sola cuenta: el email de la sesión debe
  coincidir con `ADMIN_EMAIL` (variable de entorno) **y** la sesión debe
  haber pasado por un segundo factor (`factorVerificationAge` de Clerk,
  revisado en `lib/auth.ts`). No hay alta pública de administradores.
- El código no puede forzar que una cuenta de Clerk tenga 2FA activado — eso
  se configura en el dashboard de Clerk. Lo que sí hace el código es negar el
  acceso (`SIN_SEGUNDO_FACTOR`) si la sesión no pasó por ese segundo factor,
  así que una cuenta sin 2FA activado queda bloqueada del panel en vez de
  entrar igual.

### Código de 5 dígitos hasheado, no sesión, para fichas y comentarios

Fichas y comentarios anónimos se autorizan a editar/borrar con un código
numérico de `LONGITUD_CODIGO = 5` dígitos (`lib/contrato-api.ts`), no con una
sesión:

- `lib/codigo.ts` lo genera con `crypto.randomInt` y lo hashea con `bcryptjs`
  (`RONDAS_BCRYPT = 10`) antes de guardarlo en `codigo_hash`.
- El código en claro solo aparece una vez, en la respuesta de creación
  (`POST /api/fichas`, `POST /api/comentarios`) — no se puede recuperar
  después.
- Editar o borrar (`PATCH`/`DELETE` en `/api/fichas/[id]` y
  `/api/comentarios/[id]`) exige el código en el cuerpo de la petición y lo
  compara contra el hash con `bcrypt.compare` (`verificarCodigo`). Si no
  coincide, la API responde `CODIGO_INVALIDO` (403).
- El panel de admin edita/borra el mismo contenido sin pedir código: ahí la
  sesión de Clerk es la que autoriza (`app/api/admin/fichas/[id]/route.ts`,
  `app/api/admin/comentarios/[id]/route.ts`).

### `proxy.ts` en vez de `middleware.ts`

En Next.js 16 el archivo se renombró de `middleware.ts` a `proxy.ts`
(documentado en el propio comentario de `proxy.ts`, que cita
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
El `matcher` (`config.matcher` en `proxy.ts`) cubre solo `/admin/:path*` y
`/api/admin/:path*`: el flujo anónimo de fichas y comentarios no carga Clerk
ni depende de sus claves.

### `Response.json` nativo en vez de `NextResponse` en los route handlers

Todos los handlers de `app/api/**` devuelven `Response.json(...)` (ver
`lib/respuestas-api.ts` y cada `route.ts`), nunca `NextResponse` de
`next/server`.

Motivo: el script `test` corre con el runner nativo de Node
(`node --import ./tests/registrar-alias.mjs --experimental-test-module-mocks
--test`), sin arrancar un servidor Next. `tests/api-fichas.integration.test.ts`
importa los handlers (`GET`, `POST`, `PATCH`, `DELETE`) directamente desde
`app/api/**/route.ts` y los llama con `Request`/`Response` nativos de Node.
El loader de módulos de los tests (`tests/alias-loader.mjs`) documenta
explícitamente que los subpaths de `next/*` solo se resuelven para
componentes de cliente en los tests, nunca para el código de servidor —
es decir, el código de servidor no puede depender de `next/server` si tiene
que seguir siendo importable y ejecutable bajo `node --test` sin un runtime
de Next real. Usar la `Response` nativa (disponible en Node sin polyfills)
evita esa dependencia y mantiene los route handlers testeables por
importación directa, sin mocks de framework.

## Consecuencias

**Buenas:**

- Los route handlers se testean por importación directa con `node --test`,
  sin levantar un servidor ni mockear `next/server`.
- El flujo anónimo (fichas/comentarios) no paga el costo de cargar Clerk.
- La autorización de admin no depende de que el matcher de `proxy.ts` cubra
  correctamente cada ruta: está duplicada a propósito en cada punto de
  acceso a los datos.
- Perder el código de 5 dígitos es equivalente a perder una contraseña: no
  hay forma de recuperarlo, ni siquiera para el propio autor — es una
  consecuencia deliberada del hash, no un bug.

**Malas / trade-offs:**

- La autorización de admin se repite en cada handler de `/api/admin/*` y en
  `app/admin/page.tsx` en vez de vivir en un único middleware — más código
  repetido a cambio de no confiar en el matcheo de rutas de Clerk.
- El 2FA de la cuenta admin depende de un paso manual en el dashboard de
  Clerk que el código no puede verificar en tiempo de deploy — solo lo
  verifica en tiempo de request (una cuenta sin 2FA activado queda bloqueada,
  pero nada avisa antes de eso que falta configurarlo).
- No usar `NextResponse` significa perder sus helpers específicos de Next
  (p. ej. manipulación de cookies/redirects propia de `next/server`) en los
  route handlers — no se ha necesitado ninguno de esos helpers hasta ahora.

## Alternativas consideradas

Documentadas en `PLANIFICACION.md` (fase de planificación, previa a esta
implementación):

- **Supabase** en vez de Neon + Clerk: se descartó porque su módulo de Auth
  está pensado para usuarios con cuenta propia, no para "un solo admin con
  2FA + público anónimo sin login" — se habría terminado usando su Postgres
  pero armando el 2FA aparte de todos modos.
- **SQLite/Turso** en vez de Neon: se descartó por preferir un proveedor ya
  nativo del Marketplace de Vercel (`vercel integration add neon`) con tier
  gratuito suficiente para el volumen esperado, en vez de sumar un proveedor
  adicional.

No se evaluaron alternativas a `Response.json` vs `NextResponse` ni a
`proxy.ts` vs `middleware.ts` en `PLANIFICACION.md`: son decisiones tomadas
durante la implementación, no en la fase de planificación.
