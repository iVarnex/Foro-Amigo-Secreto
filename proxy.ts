import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * En Next.js 16 el archivo `middleware.ts` se renombró a `proxy.ts`
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * `clerkMiddleware()` sigue siendo el helper de Clerk y devuelve el handler que
 * este archivo exporta por defecto.
 *
 * Aquí no se decide quién entra. `createRouteMatcher` + `auth.protect()` están
 * deprecados en Clerk Core 3 (ver node_modules/@clerk/nextjs/dist/esm/server/routeMatcher.js):
 * el matcheo por ruta puede divergir del enrutado real de Next y dejar recursos
 * alcanzables. La autorización se exige donde se toca el dato — en
 * `app/admin/page.tsx` y en cada handler de `/api/admin/*`, ambos vía
 * `lib/auth.ts`. Este archivo solo deja la sesión de Clerk disponible para
 * `auth()` en esas rutas.
 *
 * El matcher cubre solo `/admin` y `/api/admin`: el flujo anónimo de fichas y
 * comentarios no paga el costo de Clerk ni depende de sus claves.
 */
export default clerkMiddleware();

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
