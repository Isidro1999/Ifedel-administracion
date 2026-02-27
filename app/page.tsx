import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Base de Productos - IFEDEL</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/products"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Catálogo de Productos</h2>
            <p className="text-gray-600">Ver todos los productos disponibles</p>
          </Link>
          <Link
            href="/admin/import"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Importar Productos</h2>
            <p className="text-gray-600">Importar productos desde JSON o CSV</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
