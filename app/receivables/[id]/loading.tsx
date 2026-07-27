export default function Loading() {
  return (
    <div
      className="min-h-screen p-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando detalle"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-between gap-3">
          <div className="space-y-2">
            <div className="h-8 w-64 max-w-full rounded-lg bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-100" />
          </div>
          <div className="h-9 w-28 rounded-md bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-lg bg-slate-100" />
          <div className="h-40 rounded-lg bg-slate-100" />
        </div>
        <div className="h-36 rounded-lg bg-slate-100" />
        <div className="h-56 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}
