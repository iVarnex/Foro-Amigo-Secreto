import { listarComentariosParaModeracion } from "@/db/queries";
import { exigirAdminEnApi } from "@/lib/auth";
import { respuestaValidacion } from "@/lib/respuestas-api";
import { listarComentariosSchema } from "@/lib/validaciones";

export async function GET(request: Request) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { searchParams } = new URL(request.url);
  const parametros = listarComentariosSchema.safeParse({
    limite: searchParams.get("limite") ?? undefined,
    desplazamiento: searchParams.get("desplazamiento") ?? undefined,
  });
  if (!parametros.success) {
    return respuestaValidacion(parametros.error);
  }

  return Response.json({
    comentarios: await listarComentariosParaModeracion(parametros.data),
    limite: parametros.data.limite,
    desplazamiento: parametros.data.desplazamiento,
  });
}
