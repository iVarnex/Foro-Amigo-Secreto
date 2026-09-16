---
name: auth-admin
description: Cómo está montado el acceso admin (Clerk Core 3 + Next 16 proxy.ts) y qué APIs de Clerk/Next están deprecadas o removidas en las versiones instaladas
metadata:
  type: project
---

El acceso al panel `/admin` se autoriza en dos capas y **no** en el proxy:

- `lib/autorizacion-admin.ts` es lógica pura (sin Clerk ni Next): allowlist contra
  `ADMIN_EMAIL` + exigencia de segundo factor. Es lo único testeable sin
  credenciales reales, y por eso está separado de `lib/auth.ts`, que es el puente
  con Clerk (`auth()` + `currentUser()`).
- Todo handler de `/api/admin/*` empieza con `exigirAdminEnApi()`; la página del
  panel usa `verificarAccesoAdmin()`. `proxy.ts` solo monta `clerkMiddleware()`.

Trampas verificadas de las versiones instaladas (leer siempre antes de escribir):

- Next 16 renombró `middleware.ts` → `proxy.ts` (raíz, export default + `config.matcher`).
- Clerk Core 3 (`@clerk/nextjs@7`): `createRouteMatcher` y `auth.protect()` están
  **deprecados** — su propio aviso recomienda chequear en cada página/handler.
  `<SignedIn>`, `<SignedOut>` y `<Protect>` fueron **removidos**: lanzan error, se
  reemplazan por `<Show when="signed-in">`.
- El segundo factor se lee server-side de `factorVerificationAge[1]` de `auth()`;
  `-1` significa "no verificado en esta sesión". Forzar MFA obligatorio es
  configuración del dashboard de Clerk, el código solo puede comprobarla.
- `<SignIn routing="path">` exige una ruta catch-all (`[[...rest]]`).

**Why:** el paquete trae avisos de deprecación explícitos y Next 16 rompe la
convención de archivo; seguir la memoria de entrenamiento genera código que
compila pero está deprecado o directamente lanza en runtime.

**How to apply:** antes de tocar auth, releer `node_modules/@clerk/nextjs/dist/types/`
y `node_modules/next/dist/docs/`. Ver también [[tooling-verificacion]].
