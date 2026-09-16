import Link from "next/link";
import { AlergiaBadge } from "@/components/alergia-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FichaEnListado } from "@/db/queries";

const MAXIMO_GUSTOS_EN_RESUMEN = 120;

function resumir(texto: string) {
  if (texto.length <= MAXIMO_GUSTOS_EN_RESUMEN) return texto;
  return `${texto.slice(0, MAXIMO_GUSTOS_EN_RESUMEN).trimEnd()}…`;
}

export function FichaCard({ ficha }: { ficha: FichaEnListado }) {
  return (
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
      <CardContent className="flex flex-col gap-2">
        <AlergiaBadge alergias={ficha.alergias} />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Le gusta: </span>
          {resumir(ficha.gustos)}
        </p>
        <Link
          href={`/fichas/${ficha.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
        >
          {ficha.total_comentarios === 1
            ? "1 comentario →"
            : `${ficha.total_comentarios} comentarios →`}
        </Link>
      </CardContent>
    </Card>
  );
}
