"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlertIcon } from "lucide-react";
import { CodigoReveal } from "@/components/codigo-reveal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pedirApi } from "@/lib/api-cliente";
import type { DetalleError } from "@/lib/contrato-api";

type FichaCreada = {
  ficha: { id: string };
  codigo: string;
};

export function FormularioFicha() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<DetalleError | null>(null);
  const [resultado, setResultado] = useState<FichaCreada | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setError(null);

    const respuesta = await pedirApi<FichaCreada>("/api/fichas", {
      metodo: "POST",
      cuerpo: {
        nombre: datos.get("nombre"),
        gustos: datos.get("gustos"),
        no_gustos: datos.get("no_gustos"),
        alergias: datos.get("alergias"),
      },
    });

    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setResultado(respuesta.datos);
  }

  const errorDeCampo = (campo: string) => error?.campos?.[campo]?.[0];
  const hayErroresDeCampo = Object.keys(error?.campos ?? {}).length > 0;

  return (
    <>
      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        {error && !hayErroresDeCampo ? (
          <Alert variant="destructive" role="alert">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>No pudimos publicar tu ficha</AlertTitle>
            <AlertDescription>{error.mensaje}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre">Tu nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            autoComplete="name"
            aria-invalid={Boolean(errorDeCampo("nombre"))}
            aria-describedby={errorDeCampo("nombre") ? "error-nombre" : undefined}
          />
          {errorDeCampo("nombre") ? (
            <p id="error-nombre" role="alert" className="text-sm text-destructive">
              {errorDeCampo("nombre")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gustos">Me gusta</Label>
          <Textarea
            id="gustos"
            name="gustos"
            required
            maxLength={1000}
            placeholder="Chocolate amargo, bombones, obleas, papas fritas…"
            aria-invalid={Boolean(errorDeCampo("gustos"))}
            aria-describedby={errorDeCampo("gustos") ? "error-gustos" : undefined}
          />
          {errorDeCampo("gustos") ? (
            <p id="error-gustos" role="alert" className="text-sm text-destructive">
              {errorDeCampo("gustos")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="no_gustos">No me gusta</Label>
          <Textarea
            id="no_gustos"
            name="no_gustos"
            maxLength={1000}
            placeholder="Regaliz, chicles de menta, dulces de coco…"
            aria-invalid={Boolean(errorDeCampo("no_gustos"))}
            aria-describedby={
              errorDeCampo("no_gustos") ? "error-no-gustos" : undefined
            }
          />
          {errorDeCampo("no_gustos") ? (
            <p
              id="error-no-gustos"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorDeCampo("no_gustos")}
            </p>
          ) : null}
        </div>

        {/* Bloque propio y siempre visible: nunca se mezcla con "no me gusta". */}
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <Label htmlFor="alergias" className="text-destructive">
            <TriangleAlertIcon aria-hidden="true" className="size-4" />
            Alergias / intolerancias
          </Label>
          <Textarea
            id="alergias"
            name="alergias"
            maxLength={500}
            placeholder="Maní, mariscos…"
            className="bg-background"
            aria-describedby="ayuda-alergias"
            aria-invalid={Boolean(errorDeCampo("alergias"))}
          />
          <p id="ayuda-alergias" className="text-sm text-muted-foreground">
            Escribe &quot;ninguna&quot; si no aplica. Si lo dejas vacío, tu ficha
            dirá &quot;sin alergias registradas&quot;.
          </p>
          {errorDeCampo("alergias") ? (
            <p role="alert" className="text-sm text-destructive">
              {errorDeCampo("alergias")}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" disabled={enviando} aria-busy={enviando}>
          {enviando ? "Publicando…" : "Publicar ficha"}
        </Button>
      </form>

      <CodigoReveal
        codigo={resultado?.codigo ?? null}
        titulo="¡Ficha creada!"
        descripcion="Este es tu código para editar o borrar tu ficha."
        onCerrar={() => {
          const id = resultado?.ficha.id;
          setResultado(null);
          if (id) router.push(`/fichas/${id}`);
        }}
      />
    </>
  );
}
