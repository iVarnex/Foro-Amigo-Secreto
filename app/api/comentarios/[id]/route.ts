import {
  actualizarComentario,
  eliminarComentario,
  obtenerHashDeComentario,
} from "@/db/queries";
import { verificarCodigo } from "@/lib/codigo";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import {
  actualizarComentarioSchema,
  eliminarConCodigoSchema,
  idSchema,
} from "@/lib/validaciones";

const COMENTARIO_NO_ENCONTRADO = "No encontramos ese comentario.";
const CODIGO_NO_COINCIDE = "El código no coincide con el de este comentario.";

export async function PATCH(
  request: Request,
  contexto: RouteContext<"/api/comentarios/[id]">,
) {
  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = actualizarComentarioSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  const codigoHash = await obtenerHashDeComentario(identificador.data);
  if (!codigoHash) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }
  if (!(await verificarCodigo(entrada.data.codigo, codigoHash))) {
    return respuestaError("CODIGO_INVALIDO", CODIGO_NO_COINCIDE);
  }

  const comentario = await actualizarComentario(
    identificador.data,
    entrada.data.contenido,
  );
  if (!comentario) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  return Response.json({ comentario });
}

export async function DELETE(
  request: Request,
  contexto: RouteContext<"/api/comentarios/[id]">,
) {
  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = eliminarConCodigoSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  const codigoHash = await obtenerHashDeComentario(identificador.data);
  if (!codigoHash) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }
  if (!(await verificarCodigo(entrada.data.codigo, codigoHash))) {
    return respuestaError("CODIGO_INVALIDO", CODIGO_NO_COINCIDE);
  }

  await eliminarComentario(identificador.data);
  return Response.json({ eliminado: true });
}
