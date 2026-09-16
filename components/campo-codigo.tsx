import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LONGITUD_CODIGO, type DetalleError } from "@/lib/contrato-api";

/** Campo del código de 5 dígitos, compartido por fichas y comentarios. */
export function CampoCodigo({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Tu código de {LONGITUD_CODIGO} dígitos</Label>
      <Input
        id={id}
        name="codigo"
        inputMode="numeric"
        autoComplete="off"
        maxLength={LONGITUD_CODIGO}
        placeholder="48219"
        className="font-mono tracking-widest"
      />
    </div>
  );
}

export function ErrorDeFormulario({ error }: { error: DetalleError | null }) {
  if (!error) return null;
  const mensajeDeCampo = Object.values(error.campos ?? {})[0]?.[0];
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>No pudimos completar la acción</AlertTitle>
      <AlertDescription>{mensajeDeCampo ?? error.mensaje}</AlertDescription>
    </Alert>
  );
}
