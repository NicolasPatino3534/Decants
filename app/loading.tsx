export default function Loading() {
  return (
    <main
      className="premium-shell min-h-[70vh] px-4 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Cargando contenido…</p>
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-32 animate-pulse rounded-full bg-mist" />
        <div className="mt-5 h-14 max-w-xl animate-pulse rounded-md bg-mist" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-md border border-line bg-paper"
            >
              <div className="aspect-[4/3] animate-pulse bg-mist" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-mist" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-mist" />
                <div className="h-10 w-full animate-pulse rounded bg-mist" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
