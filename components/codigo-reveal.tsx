"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EstadoCopia = "inactivo" | "copiado" | "fallido";

/**
 * Muestra el código de 5 dígitos una única vez: el servidor solo guarda su hash
 * y no hay forma de recuperarlo después de cerrar este diálogo.
 */
export function CodigoReveal({
  codigo,
  titulo,
  descripcion,
  onCerrar,
}: {
  codigo: string | null;
  titulo: string;
  descripcion: string;
  onCerrar: () => void;
}) {
  const [estadoCopia, setEstadoCopia] = useState<EstadoCopia>("inactivo");

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setEstadoCopia("copiado");
    } catch {
      setEstadoCopia("fallido");
    }
  }

  function cerrar() {
    setEstadoCopia("inactivo");
    onCerrar();
  }

  return (
    <Dialog
      open={codigo !== null}
      onOpenChange={(abierto) => {
        if (!abierto) cerrar();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <p
          className="text-center font-mono text-3xl font-semibold tracking-[0.4em]"
          aria-label={`Tu código es ${codigo?.split("").join(" ")}`}
        >
          {codigo}
        </p>

        <p className="text-sm font-medium text-destructive">
          Guárdalo: es la única forma de editar o borrar más adelante. No se
          puede recuperar si lo pierdes.
        </p>

        <p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
          {estadoCopia === "copiado" ? "Código copiado al portapapeles." : null}
          {estadoCopia === "fallido"
            ? "No pudimos copiarlo automáticamente. Cópialo a mano."
            : null}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={copiar}>
            {estadoCopia === "copiado" ? <CheckIcon /> : <CopyIcon />}
            Copiar código
          </Button>
          <Button onClick={cerrar}>Entendido, listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
