---
name: tooling-verificacion
description: Cómo se verifica de verdad este repo (tests con node --test y loader de alias, límites de la base Neon) y qué no está instalado
metadata:
  type: project
---

Verificación real del repo (no hay vitest ni jest instalados):

- `npm test` → `node --import ./tests/registrar-alias.mjs --test "tests/**/*.test.ts"`.
  El loader `tests/alias-loader.mjs` resuelve el alias `@/` y las extensiones
  `.ts` que Node no infiere; sin él los tests no encuentran los módulos.
- `npm run typecheck` (`tsc --noEmit`) falla con "Cannot find name RouteContext"
  si antes no se corrió `npx next typegen` o `npm run build`: los helpers
  globales `RouteContext`/`PageProps`/`LayoutProps` son tipos generados.
- `npm run db:generate` / `npm run db:migrate` (drizzle-kit). `drizzle-kit` no
  genera migraciones de bajada: los `.down.sql` se escriben a mano en
  `db/migrations/down/` y se aplican con psql.

**Why:** son comandos que no existían en el `package.json` inicial y que se
añadieron con la primera rebanada; el loader existe porque Node no sabe leer
los alias del tsconfig.

**How to apply:** usa estos comandos tal cual antes de declarar nada terminado.
Los tests de integración de `tests/*.integration.test.ts` se saltan solos si no
hay `DATABASE_URL`; como el driver es `neon-http`, un Postgres local **no**
sirve para ejecutarlos: hace falta una base Neon real. Añadir tests de
componentes de cliente exige dependencias nuevas (testing-library + jsdom) y eso
requiere aprobación del dueño antes de instalarlas.
