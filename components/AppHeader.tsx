import Link from 'next/link'
import Image from 'next/image'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { auth, signOut } from '@/auth'

export async function AppHeader() {
  const session = await auth()

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <header className="sticky top-0 z-10 border-b-2 border-ifedel-primary bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8">
        <Link
          href="/"
          className="-ml-2 flex items-center gap-2 text-ifedel-black no-underline hover:opacity-90 transition-opacity"
          aria-label={`${IFEDelBrand.companyName} - Ir al inicio`}
        >
          {IFEDelBrand.logo?.src ? (
            <span className="flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-black ring-2 ring-ifedel-primary/20 sm:h-16 sm:w-16">
              <Image
                src={IFEDelBrand.logo.src}
                alt={IFEDelBrand.companyName}
                width={128}
                height={128}
                className="h-full w-full object-contain p-1"
                priority
              />
            </span>
          ) : (
            <span className="text-lg font-bold text-gray-800">
              {IFEDelBrand.companyName}
            </span>
          )}
        </Link>
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 truncate max-w-[180px]">
              {session.user.email}
            </span>
            <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-ifedel-brown hover:text-ifedel-primary underline transition-colors"
            >
              Cerrar sesión
            </button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
