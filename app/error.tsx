"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <Alert variant="destructive" role="alert">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>Algo salió mal</AlertTitle>
        <AlertDescription>
          No pudimos cargar esta página. Vuelve a intentarlo en un momento.
        </AlertDescription>
      </Alert>
      <Button onClick={retry} className="self-start">
        Reintentar
      </Button>
    </main>
  );
}
