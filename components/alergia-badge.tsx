import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const SIN_ALERGIAS = "Sin alergias registradas";

/**
 * Regla de producto: la alergia nunca comparte bloque visual con "no le gusta"
 * y, si el campo está vacío, se dice explícitamente en vez de omitirlo.
 */
export function AlergiaBadge({ alergias }: { alergias: string }) {
  const tieneAlergias = alergias.trim().length > 0;

  if (!tieneAlergias) {
    return (
      <Badge variant="outline" className="h-auto whitespace-normal py-1">
        {SIN_ALERGIAS}
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className="h-auto items-start whitespace-normal py-1 text-left font-semibold"
    >
      <TriangleAlertIcon aria-hidden="true" />
      <span>
        <span className="sr-only">Alerta de alergia: </span>
        ALERGIA: {alergias}
      </span>
    </Badge>
  );
}

export function AlergiaBloque({ alergias }: { alergias: string }) {
  const tieneAlergias = alergias.trim().length > 0;

  return (
    <Alert
      variant={tieneAlergias ? "destructive" : "default"}
      className={
        tieneAlergias
          ? "border-destructive/40 bg-destructive/10"
          : "border-border"
      }
    >
      {tieneAlergias ? <TriangleAlertIcon aria-hidden="true" /> : null}
      <AlertTitle className="uppercase">
        {tieneAlergias ? "Alergias / no regalar" : "Alergias"}
      </AlertTitle>
      <AlertDescription
        className={tieneAlergias ? "font-medium text-destructive" : undefined}
      >
        {tieneAlergias ? alergias : SIN_ALERGIAS}
      </AlertDescription>
    </Alert>
  );
}
