import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold">
        No encontramos esa ficha
      </h1>
      <p className="text-muted-foreground">
        Puede que se haya borrado o que el enlace esté mal escrito.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} className="self-start">
        Volver al listado
      </Button>
    </main>
  );
}
