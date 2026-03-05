import Link from 'next/link'
import Image from 'next/image'
import { IFEDelBrand } from '@/lib/ifedel-brand'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-900 no-underline hover:opacity-90 transition-opacity"
          aria-label={`${IFEDelBrand.companyName} - Ir al inicio`}
        >
          {IFEDelBrand.logo?.url ? (
            <Image
              src={IFEDelBrand.logo.url}
              alt={IFEDelBrand.companyName}
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-lg font-bold text-gray-800">
              {IFEDelBrand.companyName}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
