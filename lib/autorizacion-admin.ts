import { respuestaError } from "@/lib/respuestas-api";
import type { TipoError } from "@/lib/contrato-api";

/**
 * Reglas de acceso al panel de moderación, sin ninguna dependencia de Clerk ni
 * del runtime de Next: `lib/auth.ts` le pasa los datos de la sesión ya leídos.
 * Separarlo permite probar la autorización sin credenciales reales.
 */

export type MotivoRechazoAdmin =
  | "ADMIN_EMAIL_SIN_CONFIGURAR"
  | "SIN_SESION"
  | "EMAIL_NO_AUTORIZADO"
  | "SIN_SEGUNDO_FACTOR";

export type SesionCandidataAdmin = {
  /** Email verificado de la sesión, o `null` si no hay sesión activa. */
  emailDeLaSesion: string | null;
  /** La sesión actual pasó por un segundo factor (2FA). */
  segundoFactorVerificado: boolean;
};

export type AccesoAdmin =
  | { autorizado: true; email: string }
  | { autorizado: false; motivo: MotivoRechazoAdmin };

const TIPO_POR_MOTIVO: Record<MotivoRechazoAdmin, TipoError> = {
  ADMIN_EMAIL_SIN_CONFIGURAR: "ERROR_INTERNO",
  SIN_SESION: "NO_AUTENTICADO",
  EMAIL_NO_AUTORIZADO: "NO_AUTORIZADO",
  SIN_SEGUNDO_FACTOR: "NO_AUTORIZADO",
};

export const MENSAJE_POR_MOTIVO: Record<MotivoRechazoAdmin, string> = {
  // No se revela al cliente que falta una variable de entorno concreta.
  ADMIN_EMAIL_SIN_CONFIGURAR:
    "El panel de administración no está configurado en este entorno.",
  SIN_SESION: "Necesitas iniciar sesión como administrador.",
  EMAIL_NO_AUTORIZADO: "Esta cuenta no tiene permisos de administración.",
  SIN_SEGUNDO_FACTOR:
    "Activa la verificación en dos pasos en tu cuenta y vuelve a iniciar sesión.",
};

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Allowlist de una sola cuenta: estar autenticado en Clerk no alcanza, el email
 * de la sesión tiene que coincidir con `ADMIN_EMAIL` y la sesión tiene que
 * haber pasado por un segundo factor.
 */
export function evaluarAccesoAdmin(
  sesion: SesionCandidataAdmin,
  emailAdminConfigurado: string | undefined,
): AccesoAdmin {
  const emailPermitido = emailAdminConfigurado?.trim();
  if (!emailPermitido) {
    return { autorizado: false, motivo: "ADMIN_EMAIL_SIN_CONFIGURAR" };
  }

  if (!sesion.emailDeLaSesion) {
    return { autorizado: false, motivo: "SIN_SESION" };
  }

  const email = normalizarEmail(sesion.emailDeLaSesion);
  if (email !== normalizarEmail(emailPermitido)) {
    return { autorizado: false, motivo: "EMAIL_NO_AUTORIZADO" };
  }

  if (!sesion.segundoFactorVerificado) {
    return { autorizado: false, motivo: "SIN_SEGUNDO_FACTOR" };
  }

  return { autorizado: true, email };
}

/** Traduce el rechazo al sobre de error único de la API. */
export function respuestaRechazoAdmin(motivo: MotivoRechazoAdmin) {
  return respuestaError(TIPO_POR_MOTIVO[motivo], MENSAJE_POR_MOTIVO[motivo]);
}
