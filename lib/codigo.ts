import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { LONGITUD_CODIGO } from "@/lib/contrato-api";

const CODIGO_MINIMO = 0;
const CODIGO_MAXIMO_EXCLUSIVO = 100_000;
const RONDAS_BCRYPT = 10;

/** Código de 5 dígitos (incluye los que empiezan por cero, p. ej. "04821"). */
export function generarCodigo(): string {
  return String(randomInt(CODIGO_MINIMO, CODIGO_MAXIMO_EXCLUSIVO)).padStart(
    LONGITUD_CODIGO,
    "0",
  );
}

export function hashearCodigo(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, RONDAS_BCRYPT);
}

export function verificarCodigo(
  codigo: string,
  codigoHash: string,
): Promise<boolean> {
  return bcrypt.compare(codigo, codigoHash);
}
