import { crearFicha, listarFichas } from "@/db/queries";
import { generarCodigo, hashearCodigo } from "@/lib/codigo";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import { crearFichaSchema, listarFichasSchema } from "@/lib/validaciones";

export async function GET(request: Request) {
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
    limite: parametros.data.limite,
    desplazamiento: parametros.data.desplazamiento,
  });
}

export async function POST(request: Request) {
  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = crearFichaSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  // El código se muestra en claro únicamente en esta respuesta; en la base solo
  // queda el hash y no hay forma de recuperarlo después.
  const codigo = generarCodigo();
  const ficha = await crearFicha({
    ...entrada.data,
    codigoHash: await hashearCodigo(codigo),
  });

  return Response.json({ ficha, codigo }, { status: 201 });
}
