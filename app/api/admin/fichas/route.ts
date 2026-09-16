import { contarFichas, listarFichas } from "@/db/queries";
import { exigirAdminEnApi } from "@/lib/auth";
import { respuestaValidacion } from "@/lib/respuestas-api";
import { listarFichasSchema } from "@/lib/validaciones";

export async function GET(request: Request) {
  const rechazo = await exigirAdminEnApi();
  if (rechazo) return rechazo;

  const { searchParams } = new URL(request.url);
  const parametros = listarFichasSchema.safeParse({
    limite: searchParams.get("limite") ?? undefined,
    desplazamiento: searchParams.get("desplazamiento") ?? undefined,
  });
  if (!parametros.success) {
    return respuestaValidacion(parametros.error);
  }

  const fichas = await listarFichas(parametros.data);
  return Response.json({
    fichas,
    total: await contarFichas(),
    limite: parametros.data.limite,
    desplazamiento: parametros.data.desplazamiento,
  });
}
