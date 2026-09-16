"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, TrashIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FichaPublica } from "@/db/queries";
import { CampoCodigo, ErrorDeFormulario } from "@/components/campo-codigo";
import { pedirApi } from "@/lib/api-cliente";
import { LONGITUD_CODIGO, type DetalleError } from "@/lib/contrato-api";

type DialogoAbierto = "ninguno" | "editar" | "borrar";

export function AccionesFicha({ ficha }: { ficha: FichaPublica }) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<DialogoAbierto>("ninguno");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<DetalleError | null>(null);

  function cerrar() {
    setDialogo("ninguno");
    setError(null);
  }

  async function editar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setError(null);

    const respuesta = await pedirApi(`/api/fichas/${ficha.id}`, {
      metodo: "PATCH",
      cuerpo: {
        codigo: datos.get("codigo"),
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
    cerrar();
    router.refresh();
  }

  async function borrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setError(null);

    const respuesta = await pedirApi(`/api/fichas/${ficha.id}`, {
      metodo: "DELETE",
      cuerpo: { codigo: datos.get("codigo") },
    });

    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    cerrar();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setDialogo("editar")}>
        <PencilIcon aria-hidden="true" />
        Editar mi ficha
      </Button>
      <Button variant="destructive" onClick={() => setDialogo("borrar")}>
        <TrashIcon aria-hidden="true" />
        Borrar mi ficha
      </Button>

      <Dialog
        open={dialogo === "editar"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar mi ficha</DialogTitle>
            <DialogDescription>
              Necesitas el código de {LONGITUD_CODIGO} dígitos que te dimos al
              crearla.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editar} className="flex flex-col gap-4" noValidate>
            <ErrorDeFormulario error={error} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-nombre">Nombre</Label>
              <Input
                id="editar-nombre"
                name="nombre"
                defaultValue={ficha.nombre}
                maxLength={80}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-gustos">Me gusta</Label>
              <Textarea
                id="editar-gustos"
                name="gustos"
                defaultValue={ficha.gustos}
                maxLength={1000}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-no-gustos">No me gusta</Label>
              <Textarea
                id="editar-no-gustos"
                name="no_gustos"
                defaultValue={ficha.no_gustos}
                maxLength={1000}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <Label htmlFor="editar-alergias" className="text-destructive">
                <TriangleAlertIcon aria-hidden="true" className="size-4" />
                Alergias / intolerancias
              </Label>
              <Textarea
                id="editar-alergias"
                name="alergias"
                defaultValue={ficha.alergias}
                maxLength={500}
                className="bg-background"
                aria-describedby="editar-ayuda-alergias"
              />
              <p
                id="editar-ayuda-alergias"
                className="text-sm text-muted-foreground"
              >
                Escribe &quot;ninguna&quot; si no aplica.
              </p>
            </div>

            <CampoCodigo id="editar-codigo" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando} aria-busy={enviando}>
                {enviando ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogo === "borrar"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar mi ficha</DialogTitle>
            <DialogDescription>
              Se borrarán también sus comentarios. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={borrar} className="flex flex-col gap-4" noValidate>
            <ErrorDeFormulario error={error} />
            <CampoCodigo id="borrar-codigo" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={enviando}
                aria-busy={enviando}
              >
                {enviando ? "Borrando…" : "Borrar definitivamente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
