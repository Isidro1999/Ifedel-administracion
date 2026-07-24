/**
 * UI de transición en navegaciones del App Router (mejora percepción de velocidad).
 */
export default function Loading() {
  return (
    <div
      className="animate-pulse space-y-6 py-2"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="h-9 w-56 max-w-full rounded-lg bg-slate-200/90" />
      <div className="h-28 w-full rounded-xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
      </div>
      <div className="h-40 w-full rounded-xl bg-slate-100" />
    </div>
  )
}
