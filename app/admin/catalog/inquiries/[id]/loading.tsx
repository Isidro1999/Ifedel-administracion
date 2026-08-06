export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-56 max-w-full rounded-lg bg-slate-200" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-xl bg-slate-100" />
        <div className="h-48 rounded-xl bg-slate-100" />
      </div>
      <div className="h-32 rounded-xl bg-slate-100" />
      <div className="h-56 rounded-xl bg-slate-100" />
    </div>
  )
}
