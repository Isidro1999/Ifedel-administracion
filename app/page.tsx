import Link from 'next/link'
import {
  Banknote,
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function QuickLink({
  href,
  label,
  Icon,
}: {
  href: string
  label: string
  Icon: typeof Package
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:border-ifedel-primary/35 hover:bg-white hover:shadow-md hover:shadow-slate-900/5"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-ifedel-brown shadow-sm ring-1 ring-slate-200/80 transition group-hover:bg-ifedel-primary/10 group-hover:text-ifedel-primary group-hover:ring-ifedel-primary/25">
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ifedel-primary"
        aria-hidden
      />
    </Link>
  )
}

export default async function Home() {
  const { requireApprovedPage } = await import('@/lib/session-auth')
  const sessionUser = await requireApprovedPage()
  const isAdmin = sessionUser.role === 'ADMIN'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel general"
        description="Resumen rápido del estado del sistema comercial y financiero de IFEDEL."
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SectionCard
          title="Operación"
          description="Flujos principales del día a día comercial."
        >
          <div className="space-y-2">
            <QuickLink href="/products" label="Catálogo de productos" Icon={Package} />
            <QuickLink href="/quotes" label="Cotizaciones guardadas" Icon={FileSpreadsheet} />
            <QuickLink href="/sales" label="Ventas registradas" Icon={ShoppingCart} />
          </div>
        </SectionCard>

        <SectionCard
          title="Tesorería"
          description="Cobranzas, pagos y posición de caja."
        >
          <div className="space-y-2">
            <QuickLink href="/receivables" label="Cuentas por cobrar" Icon={Wallet} />
            <QuickLink href="/payables" label="Cuentas por pagar" Icon={Banknote} />
            <QuickLink href="/cash" label="Caja" Icon={Banknote} />
          </div>
        </SectionCard>

        <SectionCard
          title="Administración"
          description="Configuración y mantenimiento del sistema."
        >
          {isAdmin ? (
            <div className="space-y-2">
              <QuickLink href="/admin/import" label="Importar productos" Icon={Upload} />
              <QuickLink href="/admin/settings" label="Configuración general" Icon={Settings} />
              <QuickLink href="/admin/users" label="Usuarios" Icon={Users} />
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              No tenés permisos de administración. Contactá a un usuario administrador para cambios de
              configuración.
            </p>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard
          title="Actividad reciente"
          description="Estructura base lista para conectar con eventos reales del negocio."
        >
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-ifedel-primary" aria-hidden />
              <span>Ventas y cobranzas recientes.</span>
            </li>
            <li className="flex gap-2">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-ifedel-primary" aria-hidden />
              <span>Cotizaciones emitidas en los últimos días.</span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ifedel-primary" aria-hidden />
              <span>Movimientos relevantes de caja.</span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Próximos pasos"
          description="Recordatorios y tareas clave para el equipo."
        >
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ifedel-primary" />
              Revisar cuentas por cobrar próximas a vencer.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ifedel-primary" />
              Chequear compras pendientes y pagos asociados.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ifedel-primary" />
              Analizar ventas por período en analytics.
            </li>
          </ul>
        </SectionCard>
      </section>
    </div>
  )
}
