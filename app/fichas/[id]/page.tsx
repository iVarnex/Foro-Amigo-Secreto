import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AccionesFicha } from "@/components/acciones-ficha";
import { AlergiaBloque } from "@/components/alergia-badge";
import { ComentarioList } from "@/components/comentario-list";
import { obtenerFichaConComentarios } from "@/db/queries";
import { idSchema } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

const SIN_DATO = "No lo indicó";

export default async function FichaPage({
  params,
}: PageProps<"/fichas/[id]">) {
  const { id } = await params;
  const identificador = idSchema.safeParse(id);
  if (!identificador.success) notFound();

  const detalle = await obtenerFichaConComentarios(identificador.data);
  if (!detalle) notFound();

  const { ficha, comentarios } = detalle;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Volver
      </Link>

      <h1 className="font-heading text-2xl font-semibold">{ficha.nombre}</h1>

      {/* Las alergias van arriba de todo y en su propio bloque de alerta. */}
      <AlergiaBloque alergias={ficha.alergias} />

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="font-medium">Le gusta</dt>
          <dd className="text-muted-foreground">{ficha.gustos}</dd>
        </div>
        <div>
          <dt className="font-medium">No le gusta</dt>
          <dd className="text-muted-foreground">
            {ficha.no_gustos.trim() || SIN_DATO}
          </dd>
        </div>
      </dl>

      <AccionesFicha ficha={ficha} />

      <hr className="border-border" />

      <ComentarioList fichaId={ficha.id} comentarios={comentarios} />
    </main>
  );
}
