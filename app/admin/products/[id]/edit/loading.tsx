export default function Loading() {
  return (
    <div
      className="min-h-screen p-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando edición de producto"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-56 max-w-full rounded-lg bg-slate-200" />
        <div className="h-10 rounded-md bg-slate-100" />
        <div className="h-10 rounded-md bg-slate-100" />
        <div className="h-24 rounded-md bg-slate-100" />
        <div className="h-40 rounded-md bg-slate-100" />
        <div className="h-10 w-32 rounded-md bg-slate-200" />
      </div>
    </div>
  )
}
