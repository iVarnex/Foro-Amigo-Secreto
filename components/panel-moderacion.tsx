"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquareIcon, PencilIcon, TrashIcon, TriangleAlertIcon } from "lucide-react";
import { AlergiaBadge } from "@/components/alergia-badge";
import { ErrorDeFormulario } from "@/components/campo-codigo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ComentarioEnModeracion, FichaEnListado } from "@/db/queries";
import { pedirApi } from "@/lib/api-cliente";
import type { DetalleError } from "@/lib/contrato-api";

const MAXIMO_NOMBRE = 80;
const MAXIMO_TEXTO_LARGO = 1000;
const MAXIMO_ALERGIAS = 500;
const MAXIMO_COMENTARIO = 1000;
const MAXIMO_RESUMEN_COMENTARIO = 140;

type Accion =
  | { tipo: "ninguna" }
  | { tipo: "editar-ficha"; ficha: FichaEnListado }
  | { tipo: "borrar-ficha"; ficha: FichaEnListado }
  | { tipo: "editar-comentario"; comentario: ComentarioEnModeracion }
  | { tipo: "borrar-comentario"; comentario: ComentarioEnModeracion };

const SIN_ACCION: Accion = { tipo: "ninguna" };

function resumir(texto: string) {
  if (texto.length <= MAXIMO_RESUMEN_COMENTARIO) return texto;
  return `${texto.slice(0, MAXIMO_RESUMEN_COMENTARIO).trimEnd()}…`;
}

/** Aviso explícito para que el moderador no crea que la lista está completa. */
function AvisoDePagina({ mostrados, limite }: { mostrados: number; limite: number }) {
  if (mostrados < limite) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Mostrando los {limite} más recientes. Puede haber más.
    </p>
  );
}

export function PanelModeracion({
  fichas,
  comentarios,
  limiteFichas,
  limiteComentarios,
}: {
  fichas: FichaEnListado[];
  comentarios: ComentarioEnModeracion[];
  limiteFichas: number;
  limiteComentarios: number;
}) {
  const router = useRouter();
  const [accion, setAccion] = useState<Accion>(SIN_ACCION);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<DetalleError | null>(null);

  function cerrar() {
    setAccion(SIN_ACCION);
    setError(null);
  }

  /** El admin nunca envía código: la sesión es la que autoriza. */
  async function ejecutar(
    url: string,
    metodo: "PATCH" | "DELETE",
    cuerpo: unknown,
  ) {
    setEnviando(true);
    setError(null);
    const respuesta = await pedirApi(url, { metodo, cuerpo });
    setEnviando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    cerrar();
    router.refresh();
  }

  function editarFicha(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (accion.tipo !== "editar-ficha") return;
    const datos = new FormData(evento.currentTarget);
    return ejecutar(`/api/admin/fichas/${accion.ficha.id}`, "PATCH", {
      nombre: datos.get("nombre"),
      gustos: datos.get("gustos"),
      no_gustos: datos.get("no_gustos"),
      alergias: datos.get("alergias"),
    });
  }

  function editarComentario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (accion.tipo !== "editar-comentario") return;
    const datos = new FormData(evento.currentTarget);
    return ejecutar(`/api/admin/comentarios/${accion.comentario.id}`, "PATCH", {
      contenido: datos.get("contenido"),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="titulo-fichas" className="flex flex-col gap-4">
        <h2 id="titulo-fichas" className="font-heading text-lg font-semibold">
          Fichas ({fichas.length})
        </h2>
        <AvisoDePagina mostrados={fichas.length} limite={limiteFichas} />

        {fichas.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no hay fichas publicadas.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {fichas.map((ficha) => (
              <li key={ficha.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/fichas/${ficha.id}`}
                        className="underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {ficha.nombre}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <AlergiaBadge alergias={ficha.alergias} />
                    <p className="text-sm text-muted-foreground">
                      {ficha.total_comentarios === 1
                        ? "1 comentario"
                        : `${ficha.total_comentarios} comentarios`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Editar la ficha de ${ficha.nombre}`}
                        onClick={() => setAccion({ tipo: "editar-ficha", ficha })}
                      >
                        <PencilIcon aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Borrar la ficha de ${ficha.nombre}`}
                        onClick={() => setAccion({ tipo: "borrar-ficha", ficha })}
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
      </section>

      <section
        aria-labelledby="titulo-comentarios"
        className="flex flex-col gap-4"
      >
        <h2
          id="titulo-comentarios"
          className="font-heading text-lg font-semibold"
        >
          Comentarios ({comentarios.length})
        </h2>
        <AvisoDePagina
          mostrados={comentarios.length}
          limite={limiteComentarios}
        />

        {comentarios.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no hay comentarios publicados.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {comentarios.map((comentario) => (
              <li key={comentario.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <p className="flex gap-2">
                      <MessageSquareIcon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      />
                      <span>&quot;{resumir(comentario.contenido)}&quot;</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {comentario.autor_nombre ?? "Anónimo"} · en la ficha de{" "}
                      <Link
                        href={`/fichas/${comentario.ficha_id}`}
                        className="underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {comentario.ficha_nombre}
                      </Link>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Editar el comentario en la ficha de ${comentario.ficha_nombre}`}
                        onClick={() =>
                          setAccion({ tipo: "editar-comentario", comentario })
                        }
                      >
                        <PencilIcon aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Borrar el comentario en la ficha de ${comentario.ficha_nombre}`}
                        onClick={() =>
                          setAccion({ tipo: "borrar-comentario", comentario })
                        }
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
      </section>

      <Dialog
        open={accion.tipo === "editar-ficha"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar ficha</DialogTitle>
            <DialogDescription>
              Como administrador no necesitas el código de quien la publicó.
            </DialogDescription>
          </DialogHeader>

          {accion.tipo === "editar-ficha" && (
            <form onSubmit={editarFicha} className="flex flex-col gap-4" noValidate>
              <ErrorDeFormulario error={error} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-ficha-nombre">Nombre</Label>
                <Input
                  id="admin-ficha-nombre"
                  name="nombre"
                  defaultValue={accion.ficha.nombre}
                  maxLength={MAXIMO_NOMBRE}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-ficha-gustos">Le gusta</Label>
                <Textarea
                  id="admin-ficha-gustos"
                  name="gustos"
                  defaultValue={accion.ficha.gustos}
                  maxLength={MAXIMO_TEXTO_LARGO}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-ficha-no-gustos">No le gusta</Label>
                <Textarea
                  id="admin-ficha-no-gustos"
                  name="no_gustos"
                  defaultValue={accion.ficha.no_gustos}
                  maxLength={MAXIMO_TEXTO_LARGO}
                />
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <Label htmlFor="admin-ficha-alergias" className="text-destructive">
                  <TriangleAlertIcon aria-hidden="true" className="size-4" />
                  Alergias / intolerancias
                </Label>
                <Textarea
                  id="admin-ficha-alergias"
                  name="alergias"
                  defaultValue={accion.ficha.alergias}
                  maxLength={MAXIMO_ALERGIAS}
                  className="bg-background"
                  aria-describedby="admin-ayuda-alergias"
                />
                <p
                  id="admin-ayuda-alergias"
                  className="text-sm text-muted-foreground"
                >
                  Déjalo vacío solo si de verdad no hay alergias registradas.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={cerrar}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando} aria-busy={enviando}>
                  {enviando ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={accion.tipo === "borrar-ficha"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar ficha</DialogTitle>
            <DialogDescription>
              {accion.tipo === "borrar-ficha"
                ? `Se borrará la ficha de ${accion.ficha.nombre} y sus comentarios. Esta acción no se puede deshacer.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <ErrorDeFormulario error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={enviando}
                aria-busy={enviando}
                onClick={() => {
                  if (accion.tipo !== "borrar-ficha") return;
                  void ejecutar(
                    `/api/admin/fichas/${accion.ficha.id}`,
                    "DELETE",
                    {},
                  );
                }}
              >
                {enviando ? "Borrando…" : "Borrar definitivamente"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={accion.tipo === "editar-comentario"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar comentario</DialogTitle>
            <DialogDescription>
              Como administrador no necesitas el código de quien lo escribió.
            </DialogDescription>
          </DialogHeader>

          {accion.tipo === "editar-comentario" && (
            <form
              onSubmit={editarComentario}
              className="flex flex-col gap-4"
              noValidate
            >
              <ErrorDeFormulario error={error} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-comentario-contenido">Comentario</Label>
                <Textarea
                  id="admin-comentario-contenido"
                  name="contenido"
                  defaultValue={accion.comentario.contenido}
                  maxLength={MAXIMO_COMENTARIO}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={cerrar}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando} aria-busy={enviando}>
                  {enviando ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={accion.tipo === "borrar-comentario"}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar comentario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <ErrorDeFormulario error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={enviando}
                aria-busy={enviando}
                onClick={() => {
                  if (accion.tipo !== "borrar-comentario") return;
                  void ejecutar(
                    `/api/admin/comentarios/${accion.comentario.id}`,
                    "DELETE",
                    {},
                  );
                }}
              >
                {enviando ? "Borrando…" : "Borrar definitivamente"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
