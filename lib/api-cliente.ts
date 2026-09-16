import type { DetalleError, SobreError } from "@/lib/contrato-api";

export type ResultadoApi<T> =
  | { ok: true; datos: T }
  | { ok: false; error: DetalleError };

const ERROR_DE_RED: DetalleError = {
  tipo: "ERROR_INTERNO",
  mensaje: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
};

const ERROR_INESPERADO: DetalleError = {
  tipo: "ERROR_INTERNO",
  mensaje: "Ocurrió un error inesperado. Inténtalo de nuevo.",
};

function esSobreError(valor: unknown): valor is SobreError {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "error" in valor &&
    typeof (valor as SobreError).error?.mensaje === "string"
  );
}

/** Único punto de acceso del cliente a la API: siempre devuelve un resultado. */
export async function pedirApi<T>(
  url: string,
  opciones: { metodo: "POST" | "PATCH" | "DELETE"; cuerpo: unknown },
): Promise<ResultadoApi<T>> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: opciones.metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opciones.cuerpo),
    });
  } catch {
    return { ok: false, error: ERROR_DE_RED };
  }

  let contenido: unknown;
  try {
    contenido = await respuesta.json();
  } catch {
    return { ok: false, error: ERROR_INESPERADO };
  }

  if (!respuesta.ok) {
    return {
      ok: false,
      error: esSobreError(contenido) ? contenido.error : ERROR_INESPERADO,
    };
  }

  return { ok: true, datos: contenido as T };
}
