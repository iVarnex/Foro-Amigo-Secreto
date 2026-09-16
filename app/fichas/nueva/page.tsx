import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { FormularioFicha } from "@/components/formulario-ficha";

export default function NuevaFichaPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Volver
      </Link>
      <h1 className="font-heading text-2xl font-semibold">Crear mi ficha</h1>
      <FormularioFicha />
    </main>
  );
}
