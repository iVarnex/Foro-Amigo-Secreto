import { actualizarComentario, eliminarComentario } from "@/db/queries";
import { exigirAdminEnApi } from "@/lib/auth";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import { editarComentarioComoAdminSchema, idSchema } from "@/lib/validaciones";

const COMENTARIO_NO_ENCONTRADO = "No encontramos ese comentario.";

export async function PATCH(
  request: Request,
  contexto: RouteContext<"/api/admin/comentarios/[id]">,
) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = editarComentarioComoAdminSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  // Sin código de 5 dígitos: la sesión de admin es la que autoriza.
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
  _request: Request,
  contexto: RouteContext<"/api/admin/comentarios/[id]">,
) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  if (!(await eliminarComentario(identificador.data))) {
    return respuestaError("NO_ENCONTRADO", COMENTARIO_NO_ENCONTRADO);
  }

  return Response.json({ eliminado: true });
}
