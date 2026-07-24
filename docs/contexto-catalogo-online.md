# Contexto — Catálogo online IFEDEL

## Descripción

El catálogo online de IFEDEL será una sección pública tipo ecommerce sin pago online. Los clientes podrán navegar productos, ver fichas, agregar productos a una lista de consulta y enviar un mensaje de WhatsApp a IFEDEL con los productos seleccionados.

Dominio previsto:

`catalogo.ifedel.com`

## Objetivo

El objetivo del catálogo es apoyar el plan comercial de IFEDEL, permitiendo que potenciales clientes conozcan la oferta de productos de forma clara, profesional y ordenada.

El catálogo debe facilitar:

* Navegación de productos.
* Consulta por WhatsApp.
* Links compartibles a productos o categorías.
* Presentación comercial profesional.
* Reducción de mensajes manuales.
* Mejor calificación de oportunidades comerciales.

## Arquitectura recomendada

El catálogo debe vivir dentro del mismo repo/proyecto Next.js del sistema de gestión, pero separado por rutas y layout.

Estructura sugerida:

* `app/(app)` para sistema interno.
* `app/(catalogo)` para catálogo público.

El catálogo no debe usar el `AuthGuard` ni el `AppShell` interno.

El subdominio `catalogo.ifedel.com` debe apuntar a las rutas públicas del catálogo usando configuración de Vercel, middleware o rewrite por host.

## Funcionalidades v1

La primera versión debe incluir:

* Home pública del catálogo.
* Listado de productos.
* Ficha individual de producto.
* Filtros por categoría.
* Filtros por marca.
* Buscador simple.
* Productos destacados.
* Lista de consulta.
* Persistencia de lista con Zustand + localStorage.
* WhatsApp prearmado con productos seleccionados.
* Campos mínimos del interesado.
* Administración desde el sistema interno para publicar/ocultar productos.

## Rutas sugeridas

Rutas públicas:

* `/`
* `/productos`
* `/productos/[slug]`
* `/categorias/[slug]`
* `/consulta`

En producción, estas rutas deberían estar disponibles desde:

* `catalogo.ifedel.com`
* `catalogo.ifedel.com/productos`
* `catalogo.ifedel.com/productos/[slug]`
* `catalogo.ifedel.com/categorias/[slug]`
* `catalogo.ifedel.com/consulta`

## API pública

Endpoints sugeridos:

* `GET /api/catalog/products`
* `GET /api/catalog/products/[slug]`
* `GET /api/catalog/categories`
* `GET /api/catalog/brands`

Reglas:

* Solo devolver productos con `catalogVisible = true`.
* Usar whitelist explícita.
* No devolver costos, márgenes, proveedores, notas internas ni precios internos.
* Usar `slug` para páginas públicas.
* Las categorías y marcas deben incluir solo productos visibles.

## Datos públicos de producto

El catálogo puede mostrar:

* ID público
* slug
* SKU
* nombre público
* descripción corta pública
* descripción larga pública
* marca
* categoría
* imagen principal
* imágenes secundarias
* especificaciones públicas
* ficha técnica pública si aplica
* destacado
* orden
* precio público solo si `showPrice = true`
* texto “Consultar precio” si `showPrice = false`

## Datos prohibidos

El catálogo no debe mostrar ni transportar:

* cost
* costCurrency
* márgenes
* proveedor
* precios internos
* listas internas de precios
* notas internas
* lógica de cotización
* información financiera
* datos privados de clientes
* datos administrativos

## Lista de consulta

La lista de consulta reemplaza al carrito tradicional.

Debe permitir:

* Agregar producto.
* Quitar producto.
* Editar cantidad.
* Agregar comentario por producto.
* Vaciar lista.
* Completar datos del interesado.
* Generar WhatsApp prearmado.

Datos sugeridos del interesado:

* Nombre
* Localidad
* Tipo de cliente
* Comentario general

Tipos de cliente sugeridos:

* Veterinaria
* Agropecuaria
* Productor
* Distribuidor
* Empresa
* Otro

## WhatsApp

El mensaje debe incluir:

* Saludo.
* Productos seleccionados.
* SKU.
* Nombre del producto.
* Cantidad.
* Comentario por producto.
* Datos del interesado.
* Link del producto o del catálogo.

El número de WhatsApp debe configurarse en variable de entorno o configuración centralizada.

## Criterio de éxito v1

La v1 se considera exitosa si:

* Un cliente puede entrar a `catalogo.ifedel.com`.
* Puede navegar productos visibles.
* Puede ver detalle de producto.
* Puede agregar productos a una lista.
* Puede enviar un WhatsApp a IFEDEL con la consulta.
* No se expone ningún costo, margen, proveedor ni dato sensible en Network.
* El sistema interno de gestión y cotizaciones sigue funcionando igual.

## Futuras mejoras

A futuro se podrá agregar:

* Registro de leads.
* Panel interno de consultas recibidas.
* Conversión de consulta en cotización.
* Analytics de productos vistos.
* Productos relacionados.
* SEO por producto y categoría.
* Catálogo privado para distribuidores.
* Precios por tipo de cliente.
* Descarga de fichas técnicas.
