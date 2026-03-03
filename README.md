# Base de Productos - IFEDEL

Sistema completo de gestión de productos para cotizaciones, construido con Next.js 14+, Prisma ORM, TypeScript y TailwindCSS.

## 🚀 Características

- **Base de datos completa** con soporte para marcas, categorías, productos, imágenes, especificaciones, precios múltiples y archivos
- **API RESTful** con endpoints públicos y administrativos
- **Importación masiva** desde JSON o CSV con validación y reporte de errores
- **Interfaz de usuario** moderna y responsiva para catálogo y administración
- **Filtros avanzados** por marca, categoría, precio, búsqueda de texto
- **Paginación** y ordenamiento de resultados
- **Upsert inteligente** por SKU (actualiza si existe, crea si no)

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias:**

```bash
npm install
```

3. **Configurar variables de entorno:**

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` y configura:

```env
DATABASE_URL="file:./dev.db"
ADMIN_KEY="tu-clave-secreta-aqui"
```

**Importante:** Cambia `ADMIN_KEY` por una clave segura en producción.

4. **Generar el cliente de Prisma:**

```bash
npm run db:generate
```

5. **Crear la base de datos y ejecutar migraciones:**

```bash
npm run db:migrate
```

O si prefieres usar `db push` (útil para desarrollo):

```bash
npm run db:push
```

6. **Iniciar el servidor de desarrollo:**

```bash
npm run dev
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
.
├── app/                    # Next.js App Router
│   ├── api/               # Endpoints API
│   │   ├── products/      # GET /api/products, GET /api/products/[id]
│   │   └── admin/         # Endpoints administrativos
│   │       ├── products/  # POST, PUT, DELETE productos
│   │       └── import/    # POST importación masiva
│   ├── products/          # Páginas UI de productos
│   ├── admin/             # Páginas UI administrativas
│   └── layout.tsx         # Layout principal
├── lib/                   # Utilidades y helpers
│   ├── prisma.ts         # Cliente de Prisma
│   ├── utils.ts          # Funciones utilitarias
│   ├── admin-auth.ts     # Autenticación admin
│   └── import-schemas.ts # Schemas Zod para importación
├── prisma/                # Prisma ORM
│   └── schema.prisma     # Schema de base de datos
├── data/                  # Archivos de ejemplo
│   ├── sample-products.json
│   └── sample-products.csv
└── docs/                  # Documentación
    └── import-format.md  # Formato de importación
```

## 🗄️ Base de Datos

### Schema

El schema incluye las siguientes tablas:

- **brands**: Marcas de productos
- **categories**: Categorías de productos
- **products**: Productos principales (incluye `cost`, `costCurrency` opcionales)
- **product_images**: Imágenes de productos
- **product_specs**: Especificaciones técnicas
- **product_prices**: Precios (soporta múltiples listas y monedas)
- **product_files**: Archivos asociados (manuales, fichas, etc.)

### Migraciones

Para crear una nueva migración después de cambiar el schema:

```bash
npm run db:migrate
```

Para aplicar migraciones en producción:

```bash
npx prisma migrate deploy
```

### Prisma Studio

Para explorar la base de datos visualmente:

```bash
npm run db:studio
```

## 🔌 API Endpoints

### Públicos

#### GET `/api/products`

Obtiene una lista paginada de productos con filtros.

**Query Parameters:**
- `q` (string, opcional): Búsqueda por título o SKU
- `brand` (string, opcional): Filtro por marca (nombre o slug)
- `category` (string, opcional): Filtro por categoría (nombre o slug)
- `priceList` (string, opcional): Filtro por lista de precios
- `currency` (string, opcional): Filtro por moneda (default: ARS)
- `sort` (string, opcional): Ordenamiento (`name_asc`, `name_desc`, `price_asc`, `price_desc`)
- `page` (number, opcional): Número de página (default: 1)
- `pageSize` (number, opcional): Tamaño de página (default: 12)

**Ejemplo:**

```bash
curl "http://localhost:3000/api/products?q=laptop&brand=Dell&page=1&pageSize=12"
```

**Respuesta:**

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "total": 50,
    "totalPages": 5
  },
  "facets": {
    "brands": [
      { "name": "Dell", "count": 10 },
      { "name": "HP", "count": 8 }
    ],
    "categories": [
      { "name": "Computadoras", "count": 15 }
    ]
  }
}
```

#### GET `/api/products/[id]`

Obtiene los detalles completos de un producto.

**Ejemplo:**

```bash
curl "http://localhost:3000/api/products/1"
```

### Administrativos (requieren header `x-admin-key`)

#### POST `/api/admin/products`

Crea un nuevo producto.

**Headers:**
```
x-admin-key: tu-clave-admin
```

**Body:** Ver formato en `/docs/import-format.md`

**Ejemplo:**

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "x-admin-key: tu-clave-admin" \
  -d '{
    "sku": "PROD-001",
    "title": "Laptop Dell",
    "brand": "Dell",
    "category": "Computadoras",
    "prices": [{
      "priceList": "minorista",
      "currency": "ARS",
      "netPrice": 450000,
      "taxRate": 21
    }]
  }'
```

#### PUT `/api/admin/products/[id]`

Actualiza un producto existente.

**Ejemplo:**

```bash
curl -X PUT http://localhost:3000/api/admin/products/1 \
  -H "Content-Type: application/json" \
  -H "x-admin-key: tu-clave-admin" \
  -d '{...}'
```

#### DELETE `/api/admin/products/[id]`

Elimina un producto.

**Ejemplo:**

```bash
curl -X DELETE http://localhost:3000/api/admin/products/1 \
  -H "x-admin-key: tu-clave-admin"
```

#### POST `/api/admin/products/[id]/images`

Sube una imagen a Cloudinary y la asocia al producto.

**Headers:**

```
x-admin-key: tu-clave-admin
```

**Body (FormData):**
- `file`: archivo de imagen (máx 8MB)

Guarda en `product_images`:
- `url`: `secure_url` de Cloudinary
- `publicId`: `public_id` de Cloudinary
- `isPrimary`: `true` si es la primera imagen del producto
- `sortOrder`: correlativo (`0,1,2,...`)

#### PATCH `/api/admin/products/[id]/images/[imageId]`

Actualiza metadatos de una imagen:

Body (JSON, todos opcionales):

```json
{
  "isPrimary": true,
  "sortOrder": 1
}
```

- `isPrimary: true`: marca esa imagen como principal y desmarca el resto.
- `sortOrder`: actualiza el orden de la imagen.

#### DELETE `/api/admin/products/[id]/images/[imageId]`

Elimina una imagen:
- Borra en Cloudinary usando `publicId` (si existe).
- Borra el registro de `product_images`.

#### POST `/api/admin/import`

Importa productos masivamente desde JSON o CSV.

**Headers:**
```
x-admin-key: tu-clave-admin
```

**Body (FormData):**
- `file`: Archivo JSON o CSV
- `format`: `json` o `csv`

**Ejemplo con curl:**

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "x-admin-key: tu-clave-admin" \
  -F "file=@data/sample-products.json" \
  -F "format=json"
```

**Respuesta:**

```json
{
  "created": 10,
  "updated": 5,
  "failed": 2,
  "errors": [
    {
      "row": 3,
      "sku": "PROD-003",
      "message": "Validación fallida: prices[0].netPrice: Expected number, received string"
    }
  ]
}
```

## 📤 Importación Masiva

### Formato de Archivo

Consulta la documentación completa en [`/docs/import-format.md`](./docs/import-format.md).

### Campos Requeridos

- `sku`: Código único del producto
- `title`: Nombre del producto
- `brand`: Nombre de la marca
- `category`: Nombre de la categoría

### Campos Opcionales

- `short`, `description`: Descripciones
- `cost` (number), `costCurrency` (string, default "USD" cuando hay cost): Costo del producto
- `images`: Array de imágenes con `url`, `isPrimary`, `sortOrder`
- `specs`: Array de especificaciones con `label`, `value`, `sortOrder`
- `prices`: Array de precios con `priceList`, `currency`, `netPrice`, `taxRate`
- `files`: Array de archivos con `type`, `url`
- `isActive`, `isFeatured`: Booleanos

### Ejemplo JSON

```json
[
  {
    "sku": "PROD-001",
    "title": "Laptop Dell XPS 15",
    "brand": "Dell",
    "category": "Computadoras",
    "prices": [
      {
        "priceList": "minorista",
        "currency": "ARS",
        "netPrice": 450000,
        "taxRate": 21
      }
    ]
  }
]
```

### Ejemplo CSV

```csv
sku,title,brand,category,prices
PROD-001,Laptop Dell XPS 15,Dell,Computadoras,"[{""priceList"":""minorista"",""currency"":""ARS"",""netPrice"":450000,""taxRate"":21}]"
```

### Importar desde la UI

1. Ve a `/admin/import`
2. Ingresa tu clave de administrador
3. Selecciona el formato (JSON o CSV)
4. Sube el archivo
5. Haz clic en "Importar Productos"

### Importar desde línea de comandos

```bash
# JSON
curl -X POST http://localhost:3000/api/admin/import \
  -H "x-admin-key: tu-clave-admin" \
  -F "file=@data/sample-products.json" \
  -F "format=json"

# CSV
curl -X POST http://localhost:3000/api/admin/import \
  -H "x-admin-key: tu-clave-admin" \
  -F "file=@data/sample-products.csv" \
  -F "format=csv"
```

## 🎨 Interfaz de Usuario

### Páginas Disponibles

- `/`: Página de inicio con enlaces
- `/products`: Catálogo de productos con filtros, búsqueda y paginación
- `/products/[id]`: Detalle completo de un producto
- `/admin/import`: Página de importación masiva
- `/admin/settings`: Configuración de tipo de cambio USD → ARS

### Características de la UI

- **Catálogo de productos:**
  - Grid responsivo de productos
  - Búsqueda por nombre o SKU
  - Filtros por marca y categoría
  - Ordenamiento por nombre o precio
  - Paginación
  - Facets dinámicos (conteos por marca/categoría)

- **Detalle de producto:**
  - Galería de imágenes
  - Especificaciones técnicas
  - Múltiples precios con impuestos
  - Archivos descargables
  - Información completa del producto

- **Importación:**
  - Subida de archivos
  - Preview de resultados
  - Reporte de errores detallado
  - Estadísticas de importación

- **Settings:**
  - Configuración de tipo de cambio USD → ARS
  - Visualización de última actualización

## 💱 Tipo de cambio USD → ARS

El sistema permite definir un tipo de cambio USD → ARS para mostrar precios aproximados en pesos cuando los precios están en USD.

### Tabla `settings`

Se agregó una tabla `settings` (singleton) con:

- `id` (Int, fijo en 1)
- `usdArsRate` (Float): tipo de cambio (ARS por 1 USD)
- `updatedAt` (DateTime): fecha de última actualización

### Endpoints

#### GET `/api/settings/exchange-rate`

Endpoint público que devuelve el tipo de cambio actual:

```json
{
  "usdArsRate": 1085.5,
  "updatedAt": "2026-02-27T19:15:00.000Z"
}
```

Si aún no se configuró, devuelve:

```json
{
  "usdArsRate": null,
  "updatedAt": null
}
```

#### PUT `/api/admin/settings/exchange-rate`

Endpoint admin protegido con `x-admin-key` para actualizar el tipo de cambio.

**Headers:**

```
x-admin-key: tu-clave-admin
Content-Type: application/json
```

**Body:**

```json
{
  "usdArsRate": 1085.5
}
```

**Ejemplo:**

```bash
curl -X PUT http://localhost:3000/api/admin/settings/exchange-rate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: tu-clave-admin" \
  -d '{"usdArsRate":1085.5}'
```

### UI de Settings

En `/admin/settings`:

- Campo numérico para `usdArsRate` (ej: 1085.50).
- Muestra el último valor guardado y la fecha/hora de actualización.
- Usa el endpoint admin para guardar.

### Cálculo de precios en ARS

En el catálogo `/products`, si el producto tiene un precio en USD, se muestra:

- **netPrice**: precio sin IVA
- **ivaAmount**: `netPrice * (taxRate / 100)`
- **totalUsd**: `netPrice + ivaAmount`
- **totalArs**: `totalUsd * usdArsRate`

En la UI se ve, por ejemplo:

- Línea principal: precio final en USD (según `netPrice` + IVA)
- Debajo: `≈ $ XXXX,XX (al tipo de cambio NNNN.NN ARS/USD)` cuando hay tipo de cambio configurado.

## 🔒 Seguridad

Las rutas administrativas (`/api/admin/*`) están protegidas con una clave de administrador:

1. Configura `ADMIN_KEY` en `.env`
2. Incluye el header `x-admin-key` en todas las peticiones admin
3. Si la clave no coincide, recibirás un error 401

**Importante:** En producción, usa una clave segura y no la compartas públicamente.

## 🚀 Producción

### Base de Datos PostgreSQL

Para usar PostgreSQL en producción:

1. Cambia `DATABASE_URL` en `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

2. Cambia el provider en `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Ejecuta las migraciones:

```bash
npx prisma migrate deploy
```

### Build para Producción

```bash
npm run build
npm start
```

## 📝 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm start`: Inicia el servidor de producción
- `npm run lint`: Ejecuta el linter
- `npm run db:generate`: Genera el cliente de Prisma
- `npm run db:push`: Sincroniza el schema con la base de datos (desarrollo)
- `npm run db:migrate`: Crea y aplica migraciones
- `npm run db:studio`: Abre Prisma Studio

## 🐛 Solución de Problemas

### Error: "ADMIN_KEY no está configurada"

Asegúrate de tener un archivo `.env` con `ADMIN_KEY` definida.

### Error: "Prisma Client not generated"

Ejecuta `npm run db:generate` después de instalar dependencias o cambiar el schema.

### Error: "Database does not exist"

Ejecuta `npm run db:migrate` o `npm run db:push` para crear la base de datos.

### Los filtros no funcionan correctamente

Verifica que la base de datos tenga datos. Puedes importar los archivos de ejemplo desde `/data/`.

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de Zod](https://zod.dev)
- [Formato de Importación](./docs/import-format.md)

## 📄 Licencia

Este proyecto es privado y está destinado para uso interno de IFEDEL.
