# Contexto — Sistema de gestión IFEDEL

## Descripción

El sistema de gestión de IFEDEL es una aplicación interna construida con Next.js 14, TypeScript, React, Prisma 5 y PostgreSQL. Utiliza Auth.js v5 con Google OAuth y PrismaAdapter. El sistema está deployado en Vercel y utiliza Cloudinary para imágenes de producto.

El sistema funciona como backoffice comercial y operativo. Permite administrar productos, cotizaciones, ventas, compras, finanzas, clientes y datos internos de la operación.

## Stack principal

* Next.js 14 App Router
* TypeScript
* React 18
* Tailwind CSS
* Prisma 5
* PostgreSQL
* Auth.js v5 / NextAuth
* Google OAuth
* Cloudinary
* Zustand
* Zod
* @react-pdf/renderer
* Vercel

## Áreas principales

Rutas internas actuales:

* `/products`
* `/products/[id]`
* `/quotes`
* `/quotes/new`
* `/quotes/[id]`
* `/sales`
* `/purchases`
* `/receivables`
* `/payables`
* `/cash`
* `/finance`
* `/analytics/*`
* `/comercial/mapa`
* `/admin/*`

El sistema interno debe seguir funcionando como hasta ahora. El catálogo público no debe romper ni modificar el flujo actual de gestión y cotizaciones.

## Productos

Los productos son una entidad central del sistema.

Campos y relaciones actuales relevantes:

* `sku`
* `title`
* `short`
* `description`
* `brand`
* `category`
* `images`
* `files`
* `specs`
* `prices`
* `cost`
* `costCurrency`
* `isActive`
* `isFeatured`

Los productos se usan para gestión interna y cotizaciones. Algunos campos son aptos para mostrarse públicamente y otros son estrictamente internos.

## Información sensible

Nunca debe exponerse públicamente:

* `cost`
* `costCurrency`
* márgenes
* proveedor
* precios internos
* listas internas de precios
* notas internas
* datos administrativos
* datos privados de clientes
* lógica interna de cotización
* historial comercial
* rentabilidad

Cualquier endpoint público debe usar whitelist explícita.

## Riesgo detectado

Actualmente `GET /api/products` y `GET /api/products/[id]` no requieren autenticación y devuelven el modelo completo, incluyendo campos sensibles como `cost` y `costCurrency`.

Antes de abrir el catálogo público, este riesgo debe resolverse protegiendo esos endpoints o reemplazando sus respuestas por proyecciones seguras.

## Cotizaciones

El sistema interno de cotizaciones usa Zustand en cliente y luego `POST /api/quotes` para crear `Quote` y `QuoteItem`.

Las cotizaciones internas pueden incluir snapshots de producto, precios, cantidades, condiciones comerciales, PDF y conversión a venta.

El catálogo público no debe crear cotizaciones directamente ni reutilizar el flujo interno de quotes sin autenticación.

## Relación con el catálogo público

El sistema de gestión será la fuente de datos del catálogo online, pero solo deberá exponer productos publicados explícitamente.

Se deben agregar campos al modelo de producto para controlar la publicación:

* `slug`
* `catalogVisible`
* `publicTitle`
* `publicShortDescription`
* `publicDescription`
* `catalogSort`
* `showPrice`
* `catalogPriceList`

El catálogo debe consumir datos mediante endpoints nuevos bajo `/api/catalog/*`.

## Principios

* El sistema de gestión sigue siendo interno.
* El catálogo es público.
* No duplicar productos en otro sistema.
* No exponer campos sensibles.
* No crear cotizaciones desde el catálogo público en v1.
* Usar endpoints públicos con whitelist.
* Mantener separado el layout interno del layout público.
* Priorizar seguridad, simpleza y continuidad operativa.

