import Link from 'next/link'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-ifedel-black">Base de Productos - IFEDEL</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/products"
            className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Catálogo de Productos</h2>
            <p className="text-ifedel-brown">Ver todos los productos disponibles</p>
          </Link>
          <Link
            href="/quotes"
            className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Cotizaciones guardadas</h2>
            <p className="text-ifedel-brown">
              Ver y gestionar las cotizaciones persistidas.
            </p>
          </Link>
          <Link
            href="/sales"
            className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Ventas</h2>
            <p className="text-ifedel-brown">
              Ver y analizar las ventas registradas.
            </p>
          </Link>
          <Link
            href="/receivables"
            className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Cuentas por cobrar</h2>
            <p className="text-ifedel-brown">
              Consultar saldos pendientes y vencimientos.
            </p>
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/import"
                className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
              >
                <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Importar Productos</h2>
                <p className="text-ifedel-brown">Importar productos desde JSON o CSV</p>
              </Link>
              <Link
                href="/admin/settings"
                className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
              >
                <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Settings</h2>
                <p className="text-ifedel-brown">Configurar tipo de cambio USD → ARS</p>
              </Link>
              <Link
                href="/admin/users"
                className="p-6 bg-white rounded-lg shadow border-2 border-transparent hover:border-ifedel-primary hover:shadow-lg transition"
              >
                <h2 className="text-2xl font-semibold mb-2 text-ifedel-black">Usuarios</h2>
                <p className="text-ifedel-brown">Aprobar o rechazar usuarios</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
