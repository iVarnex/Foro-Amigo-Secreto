/**
 * Contrato compartido entre los route handlers y el cliente.
 * Sin dependencias de servidor: se puede importar desde componentes de cliente.
 */

export const LONGITUD_CODIGO = 5;

export type TipoError =
  | "VALIDACION"
  | "NO_ENCONTRADO"
  | "CODIGO_INVALIDO"
  | "CUERPO_INVALIDO"
  | "NO_AUTENTICADO"
  | "NO_AUTORIZADO"
  | "ERROR_INTERNO";

export type DetalleError = {
  tipo: TipoError;
  mensaje: string;
  campos?: Record<string, string[]>;
};

export type SobreError = { error: DetalleError };
