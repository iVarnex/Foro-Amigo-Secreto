import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-label="Cargando"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
