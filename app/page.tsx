import Link from 'next/link'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ifedel-black">
          Panel general
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Resumen rápido del estado del sistema comercial y financiero de IFEDEL.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Operación
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Accesos rápidos a los flujos principales del día a día.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Link
              href="/products"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Catálogo de productos</span>
            </Link>
            <Link
              href="/quotes"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Cotizaciones guardadas</span>
            </Link>
            <Link
              href="/sales"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Ventas registradas</span>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tesorería
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Seguimiento simple de cobranzas, pagos y posición de caja.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Link
              href="/receivables"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Cuentas por cobrar</span>
            </Link>
            <Link
              href="/payables"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Cuentas por pagar</span>
            </Link>
            <Link
              href="/cash"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
            >
              <span>Caja</span>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Administración
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Configuración y tareas de mantenimiento del sistema.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            {isAdmin && (
              <>
                <Link
                  href="/admin/import"
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
                >
                  <span>Importar productos</span>
                </Link>
                <Link
                  href="/admin/settings"
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
                >
                  <span>Settings generales</span>
                </Link>
                <Link
                  href="/admin/users"
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-ifedel-black hover:bg-gray-50"
                >
                  <span>Usuarios</span>
                </Link>
              </>
            )}
            {!isAdmin && (
              <p className="text-xs text-gray-500">
                No tenés permisos de administración. Contactá a un usuario administrador para cambios de configuración.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ifedel-black">
            Actividad reciente
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            En esta etapa solo mostramos una estructura básica. Más adelante se puede conectar con eventos reales.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>• Ventas y cobranzas recientes.</li>
            <li>• Cotizaciones emitidas en los últimos días.</li>
            <li>• Movimientos relevantes de caja.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ifedel-black">
            Próximos pasos
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Sección pensada para ir incorporando recordatorios y tareas claves.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>• Revisar cuentas por cobrar próximas a vencer.</li>
            <li>• Chequear compras pendientes y pagos asociados.</li>
            <li>• Analizar ventas por período en el módulo de analytics.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

