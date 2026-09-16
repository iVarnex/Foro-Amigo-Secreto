import { actualizarFicha, eliminarFicha } from "@/db/queries";
import { exigirAdminEnApi } from "@/lib/auth";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import { editarFichaComoAdminSchema, idSchema } from "@/lib/validaciones";

const FICHA_NO_ENCONTRADA = "No encontramos esa ficha.";

export async function PATCH(
  request: Request,
  contexto: RouteContext<"/api/admin/fichas/[id]">,
) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = editarFichaComoAdminSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  // Sin código de 5 dígitos: la sesión de admin es la que autoriza.
  const ficha = await actualizarFicha(identificador.data, entrada.data);
  if (!ficha) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  return Response.json({ ficha });
}

export async function DELETE(
  _request: Request,
  contexto: RouteContext<"/api/admin/fichas/[id]">,
) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { id } = await contexto.params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  // Los comentarios caen por ON DELETE CASCADE.
  if (!(await eliminarFicha(identificador.data))) {
    return respuestaError("NO_ENCONTRADO", FICHA_NO_ENCONTRADA);
  }

  return Response.json({ eliminada: true });
}
