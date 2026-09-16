import { z } from "zod";
import { LONGITUD_CODIGO } from "@/lib/contrato-api";

export const LIMITE_FICHAS_POR_PAGINA = 50;
export const LIMITE_MAXIMO_FICHAS_POR_PAGINA = 100;
export const LIMITE_COMENTARIOS_POR_PAGINA = 50;
export const LIMITE_MAXIMO_COMENTARIOS_POR_PAGINA = 100;

const MAXIMO_NOMBRE = 80;
const MAXIMO_TEXTO_LARGO = 1000;
const MAXIMO_ALERGIAS = 500;
const MAXIMO_COMENTARIO = 1000;

const textoObligatorio = (maximo: number, campo: string) =>
  z
    .string()
    .trim()
    .min(1, `${campo} no puede quedar vacío.`)
    .max(maximo, `${campo} no puede superar ${maximo} caracteres.`);

const textoOpcional = (maximo: number, campo: string) =>
  z
    .string()
    .trim()
    .max(maximo, `${campo} no puede superar ${maximo} caracteres.`)
    .default("");

export const codigoSchema = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${LONGITUD_CODIGO}}$`),
    `El código debe tener ${LONGITUD_CODIGO} dígitos.`,
  );

export const idSchema = z.uuid("Identificador inválido.");

export const crearFichaSchema = z.object({
  nombre: textoObligatorio(MAXIMO_NOMBRE, "El nombre"),
  gustos: textoObligatorio(MAXIMO_TEXTO_LARGO, "Lo que te gusta"),
  no_gustos: textoOpcional(MAXIMO_TEXTO_LARGO, "Lo que no te gusta"),
  alergias: textoOpcional(MAXIMO_ALERGIAS, "Las alergias"),
});

export const actualizarFichaSchema = z.object({
  codigo: codigoSchema,
  nombre: textoObligatorio(MAXIMO_NOMBRE, "El nombre"),
  gustos: textoObligatorio(MAXIMO_TEXTO_LARGO, "Lo que te gusta"),
  no_gustos: textoOpcional(MAXIMO_TEXTO_LARGO, "Lo que no te gusta"),
  alergias: textoOpcional(MAXIMO_ALERGIAS, "Las alergias"),
});

export const eliminarConCodigoSchema = z.object({
  codigo: codigoSchema,
});

export const crearComentarioSchema = z.object({
  ficha_id: idSchema,
  autor_nombre: z
    .string()
    .trim()
    .max(MAXIMO_NOMBRE, `El nombre no puede superar ${MAXIMO_NOMBRE} caracteres.`)
    .optional()
    .transform((valor) => (valor ? valor : null)),
  contenido: textoObligatorio(MAXIMO_COMENTARIO, "El comentario"),
});

export const actualizarComentarioSchema = z.object({
  codigo: codigoSchema,
  contenido: textoObligatorio(MAXIMO_COMENTARIO, "El comentario"),
});

export const listarFichasSchema = z.object({
  limite: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITE_MAXIMO_FICHAS_POR_PAGINA)
    .default(LIMITE_FICHAS_POR_PAGINA),
  desplazamiento: z.coerce.number().int().min(0).default(0),
});

export const listarComentariosSchema = z.object({
  limite: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITE_MAXIMO_COMENTARIOS_POR_PAGINA)
    .default(LIMITE_COMENTARIOS_POR_PAGINA),
  desplazamiento: z.coerce.number().int().min(0).default(0),
});

/**
 * El admin se autoriza por sesión, no por código: el cuerpo de edición es el
 * mismo que el de creación, sin el campo `codigo`.
 */
export const editarFichaComoAdminSchema = crearFichaSchema;

export const editarComentarioComoAdminSchema = z.object({
  contenido: textoObligatorio(MAXIMO_COMENTARIO, "El comentario"),
});

export type CrearFichaEntrada = z.infer<typeof crearFichaSchema>;
export type ActualizarFichaEntrada = z.infer<typeof actualizarFichaSchema>;
export type CrearComentarioEntrada = z.infer<typeof crearComentarioSchema>;
