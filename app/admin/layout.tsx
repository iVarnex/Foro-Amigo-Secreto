import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Panel de moderación",
  robots: { index: false, follow: false },
};

/**
 * `ClerkProvider` vive solo en este segmento: las páginas anónimas de fichas y
 * comentarios no cargan Clerk ni dependen de sus claves.
 * Este layout no autoriza nada — `/admin/login` tiene que poder renderizarse
 * sin sesión. La autorización se exige en `app/admin/page.tsx`.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
