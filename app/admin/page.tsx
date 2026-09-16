import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { TriangleAlertIcon } from "lucide-react";
import { PanelModeracion } from "@/components/panel-moderacion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listarComentariosParaModeracion, listarFichas } from "@/db/queries";
import { verificarAccesoAdmin } from "@/lib/auth";
import { MENSAJE_POR_MOTIVO } from "@/lib/autorizacion-admin";
import {
  LIMITE_COMENTARIOS_POR_PAGINA,
  LIMITE_FICHAS_POR_PAGINA,
} from "@/lib/validaciones";

// El panel se lee de la base en cada visita: nunca se prerenderiza.
export const dynamic = "force-dynamic";

function Encabezado({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-2xl font-semibold">
        🔒 Panel de moderación
      </h1>
      <div className="flex items-center gap-3">
        {children}
        <UserButton />
      </div>
    </header>
  );
}

export default async function AdminPage() {
  const acceso = await verificarAccesoAdmin();

  if (!acceso.autorizado) {
    // El proxy ya redirige al login, pero la página no confía en eso.
    if (acceso.motivo === "SIN_SESION") redirect("/admin/login");

    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <Encabezado />
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>No puedes entrar al panel</AlertTitle>
          <AlertDescription>
            {MENSAJE_POR_MOTIVO[acceso.motivo]}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const [fichas, comentarios] = await Promise.all([
    listarFichas({ limite: LIMITE_FICHAS_POR_PAGINA, desplazamiento: 0 }),
    listarComentariosParaModeracion({
      limite: LIMITE_COMENTARIOS_POR_PAGINA,
      desplazamiento: 0,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Encabezado>
        <span className="text-sm text-muted-foreground">{acceso.email}</span>
      </Encabezado>
      <p className="text-muted-foreground">
        Editar o borrar desde aquí no pide el código de 5 dígitos: tu sesión es
        la que autoriza.
      </p>
      <PanelModeracion
        fichas={fichas}
        comentarios={comentarios}
        limiteFichas={LIMITE_FICHAS_POR_PAGINA}
        limiteComentarios={LIMITE_COMENTARIOS_POR_PAGINA}
      />
    </main>
  );
}
