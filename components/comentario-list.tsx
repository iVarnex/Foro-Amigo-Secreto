"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, TrashIcon } from "lucide-react";
import { CampoCodigo, ErrorDeFormulario } from "@/components/campo-codigo";
import { CodigoReveal } from "@/components/codigo-reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { ComentarioPublico } from "@/db/queries";
import { pedirApi } from "@/lib/api-cliente";
import { LONGITUD_CODIGO, type DetalleError } from "@/lib/contrato-api";

type ComentarioCreado = { codigo: string };
type Accion = { tipo: "editar" | "borrar"; comentario: ComentarioPublico };

const AUTOR_ANONIMO = "Anónimo";

export function ComentarioList({
  fichaId,
  comentarios,
}: {
  fichaId: string;
  comentarios: ComentarioPublico[];
}) {
  const router = useRouter();
  const [accion, setAccion] = useState<Accion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnDialogo, setErrorEnDialogo] = useState<DetalleError | null>(
    null,
  );
  const [errorAlCrear, setErrorAlCrear] = useState<DetalleError | null>(null);
  const [codigoNuevo, setCodigoNuevo] = useState<string | null>(null);

  function cerrarDialogo() {
    setAccion(null);
    setErrorEnDialogo(null);
  }

  async function crear(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    setEnviando(true);
    setErrorAlCrear(null);

    const respuesta = await pedirApi<ComentarioCreado>("/api/comentarios", {
      metodo: "POST",
      cuerpo: {
        ficha_id: fichaId,
        autor_nombre: datos.get("autor_nombre"),
        contenido: datos.get("contenido"),
      },
    });

    setEnviando(false);
    if (!respuesta.ok) {
      setErrorAlCrear(respuesta.error);
      return;
    }
    formulario.reset();
    setCodigoNuevo(respuesta.datos.codigo);
    router.refresh();
  }

  async function editar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!accion) return;
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setErrorEnDialogo(null);

    const respuesta = await pedirApi(
      `/api/comentarios/${accion.comentario.id}`,
      {
        metodo: "PATCH",
        cuerpo: {
          codigo: datos.get("codigo"),
          contenido: datos.get("contenido"),
        },
      },
    );

    setEnviando(false);
    if (!respuesta.ok) {
      setErrorEnDialogo(respuesta.error);
      return;
    }
    cerrarDialogo();
    router.refresh();
  }

  async function borrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!accion) return;
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setErrorEnDialogo(null);

    const respuesta = await pedirApi(
      `/api/comentarios/${accion.comentario.id}`,
      { metodo: "DELETE", cuerpo: { codigo: datos.get("codigo") } },
    );

    setEnviando(false);
    if (!respuesta.ok) {
      setErrorEnDialogo(respuesta.error);
      return;
    }
    cerrarDialogo();
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-medium">
        Comentarios ({comentarios.length})
      </h2>

      {comentarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay comentarios. Sé la primera persona en preguntar algo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comentarios.map((comentario) => (
            <li key={comentario.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-2">
                  <p>
                    <span className="font-medium">
                      {comentario.autor_nombre ?? AUTOR_ANONIMO}:{" "}
                    </span>
                    {comentario.contenido}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAccion({ tipo: "editar", comentario })}
                    >
                      <PencilIcon aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAccion({ tipo: "borrar", comentario })}
                    >
                      <TrashIcon aria-hidden="true" />
                      Borrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={crear} className="flex flex-col gap-3" noValidate>
        <h3 className="font-medium">Escribir un comentario</h3>
        <ErrorDeFormulario error={errorAlCrear} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="autor_nombre">Tu nombre (opcional)</Label>
          <Input
            id="autor_nombre"
            name="autor_nombre"
            maxLength={80}
            autoComplete="name"
            placeholder="Puedes dejarlo vacío y quedar anónimo"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contenido">Comentario</Label>
          <Textarea
            id="contenido"
            name="contenido"
            maxLength={1000}
            placeholder="¿Chocolate oscuro o con leche?"
          />
        </div>

        <Button type="submit" disabled={enviando} aria-busy={enviando}>
          {enviando ? "Enviando…" : "Publicar comentario"}
        </Button>
      </form>

      <CodigoReveal
        codigo={codigoNuevo}
        titulo="¡Comentario publicado!"
        descripcion="Este es el código para editar o borrar tu comentario."
        onCerrar={() => setCodigoNuevo(null)}
      />

      <Dialog
        open={accion?.tipo === "editar"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrarDialogo();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mi comentario</DialogTitle>
            <DialogDescription>
              Necesitas el código de {LONGITUD_CODIGO} dígitos de este
              comentario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editar} className="flex flex-col gap-4" noValidate>
            <ErrorDeFormulario error={errorEnDialogo} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-contenido">Comentario</Label>
              <Textarea
                id="editar-contenido"
                name="contenido"
                maxLength={1000}
                defaultValue={accion?.comentario.contenido ?? ""}
              />
            </div>

            <CampoCodigo id="editar-codigo-comentario" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarDialogo}>
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
        open={accion?.tipo === "borrar"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrarDialogo();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar mi comentario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={borrar} className="flex flex-col gap-4" noValidate>
            <ErrorDeFormulario error={errorEnDialogo} />
            <CampoCodigo id="borrar-codigo-comentario" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarDialogo}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={enviando}
                aria-busy={enviando}
              >
                {enviando ? "Borrando…" : "Borrar comentario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
