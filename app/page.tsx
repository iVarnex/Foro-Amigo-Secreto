import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { FichaCard } from "@/components/ficha-card";
import { Button } from "@/components/ui/button";
import { listarFichas } from "@/db/queries";
import { LIMITE_FICHAS_POR_PAGINA } from "@/lib/validaciones";

// El listado se lee de la base en cada visita: nunca se prerenderiza.
export const dynamic = "force-dynamic";

export default async function Home() {
  const fichas = await listarFichas({
    limite: LIMITE_FICHAS_POR_PAGINA,
    desplazamiento: 0,
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold">
          🎁 Amigo Secreto
        </h1>
        <p className="text-muted-foreground">
          Publica tu ficha para que quien te tocó sepa qué regalarte.
        </p>
        <Button render={<Link href="/fichas/nueva" />} size="lg">
          <PlusIcon aria-hidden="true" />
          Crear mi ficha
        </Button>
      </header>

      {fichas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay fichas publicadas. Crea la primera.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {fichas.map((ficha) => (
            <li key={ficha.id}>
              <FichaCard ficha={ficha} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
