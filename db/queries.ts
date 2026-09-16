import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { comentarios, fichas } from "@/db/schema";

/**
 * Nunca exponemos `codigo_hash`: todas las consultas de lectura seleccionan
 * columnas explícitas.
 */
const columnasPublicasFicha = {
  id: fichas.id,
  nombre: fichas.nombre,
  gustos: fichas.gustos,
  no_gustos: fichas.noGustos,
  alergias: fichas.alergias,
  creado_en: fichas.creadoEn,
};

const columnasPublicasComentario = {
  id: comentarios.id,
  ficha_id: comentarios.fichaId,
  autor_nombre: comentarios.autorNombre,
  contenido: comentarios.contenido,
  creado_en: comentarios.creadoEn,
};

export type FichaPublica = {
  id: string;
  nombre: string;
  gustos: string;
  no_gustos: string;
  alergias: string;
  creado_en: Date;
};

export type FichaEnListado = FichaPublica & { total_comentarios: number };

export type ComentarioPublico = {
  id: string;
  ficha_id: string;
  autor_nombre: string | null;
  contenido: string;
  creado_en: Date;
};

export type ComentarioEnModeracion = ComentarioPublico & {
  ficha_nombre: string;
};

export async function listarFichas({
  limite,
  desplazamiento,
}: {
  limite: number;
  desplazamiento: number;
}): Promise<FichaEnListado[]> {
  // Un solo JOIN agregado en vez de contar comentarios ficha por ficha (N+1).
  return getDb()
    .select({
      ...columnasPublicasFicha,
      total_comentarios: sql<number>`cast(count(${comentarios.id}) as int)`,
    })
    .from(fichas)
    .leftJoin(comentarios, eq(comentarios.fichaId, fichas.id))
    .groupBy(fichas.id)
    .orderBy(desc(fichas.creadoEn))
    .limit(limite)
    .offset(desplazamiento);
}

export async function contarFichas(): Promise<number> {
  const [fila] = await getDb().select({ total: count() }).from(fichas);
  return fila?.total ?? 0;
}

export async function obtenerFicha(id: string): Promise<FichaPublica | null> {
  const [ficha] = await getDb()
    .select(columnasPublicasFicha)
    .from(fichas)
    .where(eq(fichas.id, id))
    .limit(1);
  return ficha ?? null;
}

export async function listarComentariosDeFicha(
  fichaId: string,
): Promise<ComentarioPublico[]> {
  return getDb()
    .select(columnasPublicasComentario)
    .from(comentarios)
    .where(eq(comentarios.fichaId, fichaId))
    .orderBy(comentarios.creadoEn);
}

/**
 * Listado transversal de comentarios para el panel de moderación: trae el
 * nombre de la ficha en el mismo JOIN para no consultarla una vez por
 * comentario (N+1).
 */
export async function listarComentariosParaModeracion({
  limite,
  desplazamiento,
}: {
  limite: number;
  desplazamiento: number;
}): Promise<ComentarioEnModeracion[]> {
  return getDb()
    .select({
      ...columnasPublicasComentario,
      ficha_nombre: fichas.nombre,
    })
    .from(comentarios)
    .innerJoin(fichas, eq(comentarios.fichaId, fichas.id))
    .orderBy(desc(comentarios.creadoEn))
    .limit(limite)
    .offset(desplazamiento);
}

export async function obtenerFichaConComentarios(id: string) {
  const ficha = await obtenerFicha(id);
  if (!ficha) return null;
  return { ficha, comentarios: await listarComentariosDeFicha(id) };
}

export async function crearFicha(valores: {
  nombre: string;
  gustos: string;
  no_gustos: string;
  alergias: string;
  codigoHash: string;
}): Promise<FichaPublica> {
  const [ficha] = await getDb()
    .insert(fichas)
    .values({
      nombre: valores.nombre,
      gustos: valores.gustos,
      noGustos: valores.no_gustos,
      alergias: valores.alergias,
      codigoHash: valores.codigoHash,
    })
    .returning(columnasPublicasFicha);
  return ficha;
}

export async function obtenerHashDeFicha(id: string): Promise<string | null> {
  const [fila] = await getDb()
    .select({ codigoHash: fichas.codigoHash })
    .from(fichas)
    .where(eq(fichas.id, id))
    .limit(1);
  return fila?.codigoHash ?? null;
}

export async function actualizarFicha(
  id: string,
  valores: {
    nombre: string;
    gustos: string;
    no_gustos: string;
    alergias: string;
  },
): Promise<FichaPublica | null> {
  const [ficha] = await getDb()
    .update(fichas)
    .set({
      nombre: valores.nombre,
      gustos: valores.gustos,
      noGustos: valores.no_gustos,
      alergias: valores.alergias,
    })
    .where(eq(fichas.id, id))
    .returning(columnasPublicasFicha);
  return ficha ?? null;
}

export async function eliminarFicha(id: string): Promise<boolean> {
  const filas = await getDb()
    .delete(fichas)
    .where(eq(fichas.id, id))
    .returning({ id: fichas.id });
  return filas.length > 0;
}

export async function crearComentario(valores: {
  ficha_id: string;
  autor_nombre: string | null;
  contenido: string;
  codigoHash: string;
}): Promise<ComentarioPublico> {
  const [comentario] = await getDb()
    .insert(comentarios)
    .values({
      fichaId: valores.ficha_id,
      autorNombre: valores.autor_nombre,
      contenido: valores.contenido,
      codigoHash: valores.codigoHash,
    })
    .returning(columnasPublicasComentario);
  return comentario;
}

export async function obtenerHashDeComentario(
  id: string,
): Promise<string | null> {
  const [fila] = await getDb()
    .select({ codigoHash: comentarios.codigoHash })
    .from(comentarios)
    .where(eq(comentarios.id, id))
    .limit(1);
  return fila?.codigoHash ?? null;
}

export async function actualizarComentario(
  id: string,
  contenido: string,
): Promise<ComentarioPublico | null> {
  const [comentario] = await getDb()
    .update(comentarios)
    .set({ contenido })
    .where(eq(comentarios.id, id))
    .returning(columnasPublicasComentario);
  return comentario ?? null;
}

export async function eliminarComentario(id: string): Promise<boolean> {
  const filas = await getDb()
    .delete(comentarios)
    .where(eq(comentarios.id, id))
    .returning({ id: comentarios.id });
  return filas.length > 0;
}
