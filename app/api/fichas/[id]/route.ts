import {
  actualizarFicha,
  eliminarFicha,
  obtenerFichaConComentarios,
  obtenerHashDeFicha,
} from "@/db/queries";
import { verificarCodigo } from "@/lib/codigo";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import {
  actualizarFichaSchema,
  eliminarConCodigoSchema,
  idSchema,
} from "@/lib/validaciones";

const FICHA_NO_ENCONTRADA = "No encontramos esa ficha.";
const CODIGO_NO_COINCIDE = "El código no coincide con el de esta ficha.";

export async function GET(
  _request: Request,
  contexto: RouteContext<"/api/fichas/[id]">,
) {
  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  const detalle = await obtenerFichaConComentarios(identificador.data);
  if (!detalle) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  return Response.json(detalle);
}

export async function PATCH(
  request: Request,
  contexto: RouteContext<"/api/fichas/[id]">,
) {
  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = actualizarFichaSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  const codigoHash = await obtenerHashDeFicha(identificador.data);
  if (!codigoHash) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }
  if (!(await verificarCodigo(entrada.data.codigo, codigoHash))) {
    return respuestaError("CODIGO_INVALIDO", CODIGO_NO_COINCIDE);
  }

  const ficha = await actualizarFicha(identificador.data, entrada.data);
  if (!ficha) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  return Response.json({ ficha });
}

export async function DELETE(
  request: Request,
  contexto: RouteContext<"/api/fichas/[id]">,
) {
  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = eliminarConCodigoSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  const codigoHash = await obtenerHashDeFicha(identificador.data);
  if (!codigoHash) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }
  if (!(await verificarCodigo(entrada.data.codigo, codigoHash))) {
    return respuestaError("CODIGO_INVALIDO", CODIGO_NO_COINCIDE);
  }

  // Los comentarios caen por ON DELETE CASCADE.
  await eliminarFicha(identificador.data);
  return Response.json({ eliminada: true });
}
