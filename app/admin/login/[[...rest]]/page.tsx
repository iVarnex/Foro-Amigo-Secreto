import { SignIn } from "@clerk/nextjs";

/**
 * Ruta catch-all porque `<SignIn>` con `routing="path"` navega a subrutas
 * propias (verificación en dos pasos, recuperar contraseña…). Sin el
 * `[[...rest]]` Clerk lanza el error de "catch-all route".
 * No se prerenderiza: `ClerkProvider` necesita las claves en tiempo de
 * ejecución, no en el build.
 */
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold">
        🔒 Admin — iniciar sesión
      </h1>
      <SignIn path="/admin/login" routing="path" fallbackRedirectUrl="/admin" />
    </main>
  );
}
