import type { User } from "@clerk/backend";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  evaluarAccesoAdmin,
  respuestaRechazoAdmin,
  type AccesoAdmin,
} from "@/lib/autorizacion-admin";

/**
 * Puente entre Clerk y las reglas puras de `lib/autorizacion-admin.ts`.
 * Solo se importa desde servidor (Server Components y route handlers).
 */

/** Índice del segundo factor dentro de `factorVerificationAge` de Clerk. */
const SEGUNDO_FACTOR = 1;
/** Clerk devuelve -1 cuando ese factor nunca se verificó en esta sesión. */
const FACTOR_SIN_VERIFICAR = -1;

/**
 * Solo cuenta el email principal y verificado: un email sin verificar podría
 * ser el de otra persona y no puede habilitar la allowlist.
 */
function emailPrincipalVerificado(usuario: User | null): string | null {
  if (!usuario) return null;
  const principal = usuario.emailAddresses.find(
    (email) => email.id === usuario.primaryEmailAddressId,
  );
  if (!principal || principal.verification?.status !== "verified") return null;
  return principal.emailAddress;
}

export async function verificarAccesoAdmin(): Promise<AccesoAdmin> {
  const { userId, factorVerificationAge } = await auth();

  if (!userId) {
    return evaluarAccesoAdmin(
      { emailDeLaSesion: null, segundoFactorVerificado: false },
      process.env.ADMIN_EMAIL,
    );
  }

  return evaluarAccesoAdmin(
    {
      emailDeLaSesion: emailPrincipalVerificado(await currentUser()),
      segundoFactorVerificado:
        (factorVerificationAge?.[SEGUNDO_FACTOR] ?? FACTOR_SIN_VERIFICAR) !==
        FACTOR_SIN_VERIFICAR,
    },
    process.env.ADMIN_EMAIL,
  );
}

/**
 * Devuelve la respuesta de error lista para retornar, o `null` si la sesión
 * está autorizada. Todo endpoint de `/api/admin/*` empieza por aquí.
 */
export async function exigirAdminEnApi(): Promise<Response | null> {
  const acceso = await verificarAccesoAdmin();
  return acceso.autorizado ? null : respuestaRechazoAdmin(acceso.motivo);
}
