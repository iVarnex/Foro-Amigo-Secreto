import { crearComentario, obtenerFicha } from "@/db/queries";
import { generarCodigo, hashearCodigo } from "@/lib/codigo";
import {
  leerCuerpoJson,
  respuestaError,
  respuestaValidacion,
} from "@/lib/respuestas-api";
import { crearComentarioSchema } from "@/lib/validaciones";

export async function POST(request: Request) {
  const cuerpo = await leerCuerpoJson(request);
  if (!cuerpo.ok) {
    return respuestaError("CUERPO_INVALIDO", "El cuerpo debe ser JSON válido.");
  }

  const entrada = crearComentarioSchema.safeParse(cuerpo.valor);
  if (!entrada.success) {
    return respuestaValidacion(entrada.error);
  }

  const ficha = await obtenerFicha(entrada.data.ficha_id);
  if (!ficha) {
    return respuestaError("NO_ENCONTRADO", "No encontramos esa ficha.");
  }

  // Mismo patrón que la ficha: el código viaja en claro solo en esta respuesta.
  const codigo = generarCodigo();
  const comentario = await crearComentario({
    ...entrada.data,
    codigoHash: await hashearCodigo(codigo),
  });

  return Response.json({ comentario, codigo }, { status: 201 });
}
