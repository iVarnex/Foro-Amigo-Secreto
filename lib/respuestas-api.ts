import { z, type ZodError } from "zod";
import type { SobreError, TipoError } from "@/lib/contrato-api";

/**
 * Sobre de error único de la API: `tipo` es legible por máquina, `mensaje` se
 * puede mostrar tal cual al usuario y `campos` solo aparece en errores de
 * validación.
 */
const ESTADO_POR_TIPO: Record<TipoError, number> = {
  VALIDACION: 400,
  CUERPO_INVALIDO: 400,
  CODIGO_INVALIDO: 403,
  NO_AUTENTICADO: 401,
  NO_AUTORIZADO: 403,
  NO_ENCONTRADO: 404,
  ERROR_INTERNO: 500,
};

export function respuestaError(
  tipo: TipoError,
  mensaje: string,
  campos?: Record<string, string[]>,
) {
  const sobre: SobreError = {
    error: { tipo, mensaje, ...(campos ? { campos } : {}) },
  };
  return Response.json(sobre, { status: ESTADO_POR_TIPO[tipo] });
}

export function respuestaValidacion(error: ZodError) {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const campos = Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entrada): entrada is [string, string[]] => Array.isArray(entrada[1]),
    ),
  );
  return respuestaError(
    "VALIDACION",
    formErrors[0] ?? "Revisa los datos enviados.",
    campos,
  );
}

/** Lee el JSON del request sin dejar que un cuerpo malformado tumbe el handler. */
export async function leerCuerpoJson(
  request: Request,
): Promise<{ ok: true; valor: unknown } | { ok: false }> {
  try {
    return { ok: true, valor: await request.json() };
  } catch {
    return { ok: false };
  }
}
