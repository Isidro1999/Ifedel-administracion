export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-64 max-w-full rounded-lg bg-slate-200" />
      <div className="h-[420px] rounded-xl bg-slate-100" />
    </div>
  )
}
