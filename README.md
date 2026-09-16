# Directorio de Amigo Secreto / Amigo Dulce

Foro anónimo para organizar un intercambio de Amigo Secreto / Amigo Dulce:
cualquiera publica su ficha (gustos, qué no regalarle, alergias) y comenta en
las de otros sin necesidad de cuenta. Cada ficha y cada comentario se editan o
borran con un código numérico de 5 dígitos que solo se muestra una vez, al
crearlos. Un panel de administración aparte (con sesión y 2FA obligatorios)
permite moderar cualquier ficha o comentario sin ese código.

## Stack

Tomado de `package.json`:

- **Next.js 16** (App Router) + **React 19** + TypeScript, desplegado en Vercel.
- **Tailwind CSS 4** + shadcn/ui (`components.json`) para la interfaz.
- **Drizzle ORM** sobre **Neon Postgres** (`@neondatabase/serverless`) para persistencia.
- **Clerk** (`@clerk/nextjs`) para la sesión de administración, con verificación en dos pasos.
- **Zod** para validación de entrada y **bcryptjs** para hashear los códigos de 5 dígitos.
- Tests con el runner nativo de Node (`node --test`), sin framework adicional.

## Requisitos

- Node.js (el proyecto usa `@types/node` en versión `20.x`; se asume Node 20 o superior — no verificado contra un `.nvmrc`, no existe en el repo).
- Una base Postgres accesible (Neon en producción; en local puede ser cualquier Postgres si se le apunta con `DATABASE_URL`).
- Una aplicación de Clerk para probar el panel de administración.

## Instalación y arranque en local

```bash
npm install
```

Copia las variables de entorno necesarias (ver tabla abajo) a un archivo
`.env.local` — `.gitignore` ignora cualquier `.env*` salvo `.env.example`, así
que ese es el archivo pensado para no versionarse.

Aplica las migraciones existentes contra tu base:

```bash
npm run db:migrate
```

Arranca el servidor de desarrollo:

```bash
npm run dev
```

La app queda en `http://localhost:3000`. El listado de fichas (`/`) y el flujo
de creación (`/fichas/nueva`) no necesitan las claves de Clerk — solo
`DATABASE_URL`. El panel (`/admin`) sí necesita Clerk configurado, porque
`app/admin/layout.tsx` monta `ClerkProvider` únicamente en ese segmento.

## Variables de entorno

<!-- No se pudo leer .env.example: el archivo está denegado por la configuración de permisos de esta sesión. Verificar manualmente que coincide con esta tabla. -->

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión Postgres. La lee `db/index.ts` (`neon(process.env.DATABASE_URL!)`) y `drizzle.config.ts` para generar/aplicar migraciones. |
| `ADMIN_EMAIL` | Sí, para que el panel funcione | Único email autorizado a entrar a `/admin`. Se compara (normalizado a minúsculas) contra el email principal verificado de la sesión de Clerk en `lib/auth.ts` / `lib/autorizacion-admin.ts`. Si falta, el panel responde `ADMIN_EMAIL_SIN_CONFIGURAR` en vez de dejar pasar a cualquiera. |
| `CLERK_SECRET_KEY` | Sí, para el panel | Clave de servidor de Clerk. No se lee explícitamente en el código del repo (la usa el SDK `@clerk/nextjs` internamente, vía `clerkMiddleware()` en `proxy.ts` y `ClerkProvider` en `app/admin/layout.tsx`) — nombre estándar de Clerk, <!-- TODO - verificar contra .env.example -->. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sí, para el panel | Clave pública de Clerk, usada por el cliente (`ClerkProvider`, `UserButton`, el formulario de login en `app/admin/login/[[...rest]]/page.tsx`). Mismo caso que la anterior: la resuelve el SDK, no aparece como `process.env.*` explícito en este repo. <!-- TODO - verificar contra .env.example --> |

## Comandos

Todos definidos en `package.json`:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Next.js. |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build de producción (requiere `npm run build` antes). |
| `npm run lint` | ESLint (`eslint.config.mjs`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | `node --test` sobre `tests/**/*.test.ts`, con un loader propio (`tests/registrar-alias.mjs`) que resuelve el alias `@/` y expone un DOM de jsdom. Ver [Tests](#tests). |
| `npm run db:generate` | `drizzle-kit generate` — genera una migración nueva a partir de cambios en `db/schema.ts`. |
| `npm run db:migrate` | `drizzle-kit migrate` — aplica las migraciones de `db/migrations/` contra `DATABASE_URL`. |

## Tests

`npm test` corre todos los archivos bajo `tests/`. La mayoría son unitarios
(`tests/codigo.test.ts`, `tests/validaciones.test.ts`,
`tests/autorizacion-admin.test.ts`, `tests/api-cliente.test.ts`,
`tests/formulario-ficha.test.ts`) e importan directamente los route handlers y
funciones de `lib/` y `db/` sin depender de Next en ejecución.

`tests/api-fichas.integration.test.ts` es distinto: corre contra una base real
(sin mocks, porque prueba justamente el esquema y sus restricciones) y se
salta a sí mismo si no hay `DATABASE_URL` configurada en el entorno — no
apuntes esa variable a una base de producción al correr los tests.

## Pasos pendientes antes de un despliegue real

El código está completo y en verde localmente, pero el entorno de producción
todavía no está provisionado:

1. **Base de datos**: `vercel integration add neon` en el proyecto de Vercel — provisiona Neon e inyecta `DATABASE_URL` automáticamente.
2. **Autenticación de admin**: `vercel integration add clerk` — provisiona Clerk e inyecta `CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. **2FA obligatorio para la cuenta admin**: esto no se puede forzar desde código. `lib/autorizacion-admin.ts` rechaza el acceso si la sesión no pasó por un segundo factor (`SIN_SEGUNDO_FACTOR`), pero que el segundo factor exista depende de que se active manualmente en el dashboard de Clerk, en la cuenta correspondiente a `ADMIN_EMAIL`. Sin ese paso manual, esa cuenta simplemente no podrá completar el 2FA y quedará bloqueada del panel — hazlo antes de invitarla.
4. Definir `ADMIN_EMAIL` en las variables de entorno de Vercel con el email exacto (verificado) de esa cuenta de Clerk.

<!-- TODO - verificar: no hay forma de confirmar desde este repo si las integraciones de Vercel ya se ejecutaron o si Clerk ya tiene una cuenta admin creada. -->

## Estructura relevante

```
app/
  page.tsx                  # Listado de fichas
  fichas/nueva/page.tsx     # Formulario de creación
  fichas/[id]/page.tsx      # Ficha + comentarios
  admin/                    # Panel de moderación (Clerk)
  api/
    fichas/, comentarios/   # Endpoints anónimos (autorizan por código de 5 dígitos)
    admin/fichas/, admin/comentarios/  # Endpoints de moderación (autorizan por sesión Clerk)
db/
  schema.ts                 # Tablas fichas / comentarios (Drizzle)
  queries.ts, index.ts, migrations/
lib/
  codigo.ts                 # Generar/hashear/verificar el código de 5 dígitos
  auth.ts, autorizacion-admin.ts  # Reglas de acceso al panel
  contrato-api.ts, respuestas-api.ts  # Sobre de error único de la API
  validaciones.ts           # Esquemas Zod compartidos por los endpoints
proxy.ts                    # Equivalente a middleware.ts en Next.js 16; solo expone la sesión de Clerk
```

## Contrato de errores de la API

Todos los endpoints de `app/api/**` devuelven, en caso de error, el mismo
sobre (`lib/respuestas-api.ts`, `lib/contrato-api.ts`):

```json
{ "error": { "tipo": "CODIGO_INVALIDO", "mensaje": "...", "campos": { } } }
```

`campos` solo aparece en errores de tipo `VALIDACION`. Los tipos posibles y su
código HTTP están en `lib/contrato-api.ts` / `lib/respuestas-api.ts`:
`VALIDACION` y `CUERPO_INVALIDO` (400), `NO_AUTENTICADO` (401),
`CODIGO_INVALIDO` y `NO_AUTORIZADO` (403), `NO_ENCONTRADO` (404),
`ERROR_INTERNO` (500).
