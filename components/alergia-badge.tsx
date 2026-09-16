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
    <div className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-destructive px-3 py-2 text-destructive-foreground shadow-sm">
      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span className="text-sm font-bold">
        <span className="sr-only">Alerta de alergia: </span>
        ALERGIA: {alergias}
      </span>
    </div>
  );
}

export function AlergiaBloque({ alergias }: { alergias: string }) {
  const tieneAlergias = alergias.trim().length > 0;

  return (
    <Alert
      variant={tieneAlergias ? "destructive" : "default"}
      className={
        tieneAlergias
          ? "border-2 border-destructive bg-destructive text-destructive-foreground [&>svg]:size-6 [&>svg]:text-destructive-foreground"
          : "border-border"
      }
    >
      {tieneAlergias ? <TriangleAlertIcon aria-hidden="true" /> : null}
      <AlertTitle
        className={tieneAlergias ? "text-base font-bold uppercase" : "uppercase"}
      >
        {tieneAlergias ? "Alergias / no regalar" : "Alergias"}
      </AlertTitle>
      <AlertDescription
        className={
          tieneAlergias ? "font-semibold text-destructive-foreground" : undefined
        }
      >
        {tieneAlergias ? alergias : SIN_ALERGIAS}
      </AlertDescription>
    </Alert>
  );
}
