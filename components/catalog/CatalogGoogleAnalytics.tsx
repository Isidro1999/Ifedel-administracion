'use client'

import Script from 'next/script'
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

type CatalogGoogleAnalyticsProps = {
  measurementId: string
}

/**
 * page_view en navegación App Router.
 * El config inicial usa send_page_view: false para evitar duplicar el primer hit.
 */
function CatalogGaRoutePageViews({
  measurementId,
}: CatalogGoogleAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams?.toString()
    const pagePath = qs ? `${pathname}?${qs}` : pathname

    let cancelled = false
    let attempts = 0

    const send = () => {
      if (cancelled) return
      if (typeof window.gtag === 'function') {
        window.gtag('config', measurementId, {
          page_path: pagePath,
        })
        return
      }
      // Script afterInteractive: breve espera si el efecto corre antes que gtag.
      if (attempts < 40) {
        attempts += 1
        window.setTimeout(send, 50)
      }
    }

    send()
    return () => {
      cancelled = true
    }
  }, [measurementId, pathname, searchParams])

  return null
}

/**
 * Carga gtag.js únicamente cuando el layout del catálogo monta este componente.
 */
export function CatalogGoogleAnalytics({
  measurementId,
}: CatalogGoogleAnalyticsProps) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="catalog-ga4-init" strategy="afterInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });
`}</Script>
      <Suspense fallback={null}>
        <CatalogGaRoutePageViews measurementId={measurementId} />
      </Suspense>
    </>
  )
}
