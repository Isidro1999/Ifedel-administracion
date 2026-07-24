'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { catalogPath, isCatalogHostName } from '@/lib/catalog-paths'

type CatalogPathContextValue = {
  onCatalogHost: boolean
  path: (segment?: string) => string
}

const CatalogPathContext = createContext<CatalogPathContextValue>({
  onCatalogHost: false,
  path: (segment = '') => catalogPath(segment, false),
})

export function CatalogPathProvider({
  onCatalogHost,
  children,
}: {
  onCatalogHost: boolean
  children: ReactNode
}) {
  const value = useMemo<CatalogPathContextValue>(
    () => ({
      onCatalogHost,
      path: (segment = '') => catalogPath(segment, onCatalogHost),
    }),
    [onCatalogHost],
  )

  return (
    <CatalogPathContext.Provider value={value}>
      {children}
    </CatalogPathContext.Provider>
  )
}

/** Paths relativos al catálogo (respeta subdominio vs /catalogo). */
export function useCatalogPath() {
  const ctx = useContext(CatalogPathContext)

  // Fallback si se usa fuera del provider (ej. admin): detectar host o prefijo.
  if (!ctx) {
    const onHost =
      typeof window !== 'undefined'
        ? isCatalogHostName(window.location.host)
        : false
    return {
      onCatalogHost: onHost,
      path: (segment = '') => catalogPath(segment, onHost),
    }
  }

  return ctx
}
