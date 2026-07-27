export default function Loading() {
  return (
    <div
      className="min-h-screen p-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando producto"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 h-5 w-40 rounded bg-slate-200" />
        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-2">
            <div className="aspect-square rounded-lg bg-slate-100" />
            <div className="space-y-4">
              <div className="h-4 w-32 rounded bg-slate-100" />
              <div className="h-9 w-3/4 max-w-md rounded-lg bg-slate-200" />
              <div className="h-20 rounded-lg bg-slate-100" />
              <div className="h-32 rounded-lg bg-slate-100" />
              <div className="h-24 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
