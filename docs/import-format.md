# Formato de Importación de Productos

Este documento describe el formato requerido para importar productos masivamente mediante JSON o CSV.

## Campos Requeridos

- `sku` (string): Código único del producto. Se usa para identificar si el producto ya existe (upsert).
- `title` (string): Nombre del producto.
- `brand` (string): Nombre de la marca. Si no existe, se creará automáticamente.
- `category` (string): Nombre de la categoría. Si no existe, se creará automáticamente.

## Campos Opcionales

- `short` (string): Descripción corta del producto.
- `description` (string): Descripción completa del producto.
- `cost` (number): Costo del producto. Opcional.
- `costCurrency` (string): Moneda del costo. Si no se envía y hay `cost`, se usa `"USD"`.
- `isActive` (boolean, default: `true`): Si el producto está activo.
- `isFeatured` (boolean, default: `false`): Si el producto es destacado.
- `images` (array): Lista de imágenes del producto.
- `specs` (array): Lista de especificaciones técnicas.
- `prices` (array): Lista de precios del producto.
- `files` (array): Lista de archivos asociados (manuales, fichas técnicas, etc.).

## Estructura de Imágenes

```json
{
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "isPrimary": true,
      "sortOrder": 0
    }
  ]
}
```

- `url` (string, requerido): URL de la imagen.
- `isPrimary` (boolean, default: `false`): Si es la imagen principal.
- `sortOrder` (number, default: `0`): Orden de visualización.

## Estructura de Especificaciones

```json
{
  "specs": [
    {
      "label": "Procesador",
      "value": "Intel Core i7",
      "sortOrder": 0
    }
  ]
}
```

- `label` (string, requerido): Etiqueta de la especificación.
- `value` (string, requerido): Valor de la especificación.
- `sortOrder` (number, default: `0`): Orden de visualización.

## Estructura de Precios

```json
{
  "prices": [
    {
      "priceList": "minorista",
      "currency": "ARS",
      "netPrice": 100000,
      "taxRate": 21,
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": null
    }
  ]
}
```

- `priceList` (string, requerido): Nombre de la lista de precios (ej: "minorista", "mayorista").
- `currency` (string, default: `"ARS"`): Código de moneda (ARS, USD, etc.).
- `netPrice` (number, requerido): Precio neto (debe ser positivo).
- `taxRate` (number, default: `0`): Tasa de impuesto en porcentaje (0-100).
- `validFrom` (string, opcional): Fecha de inicio de validez (ISO 8601).
- `validTo` (string, opcional): Fecha de fin de validez (ISO 8601).

**Nota:** Se recomienda incluir al menos un precio por producto.

## Costo del producto

- `cost` (number, opcional): Costo del producto.
- `costCurrency` (string, opcional): Moneda del costo (ej: `"USD"`). Si no se envía y hay `cost`, se usa `"USD"`. No rompe importaciones anteriores si no se envía.

## Estructura de Archivos

```json
{
  "files": [
    {
      "type": "manual",
      "url": "https://example.com/manual.pdf"
    }
  ]
}
```

- `type` (string, requerido): Tipo de archivo (ej: "manual", "ficha", "catalogo").
- `url` (string, requerido): URL del archivo.

## Formato JSON

Ejemplo completo:

```json
[
  {
    "sku": "PROD-001",
    "title": "Laptop Dell XPS 15",
    "brand": "Dell",
    "category": "Computadoras",
    "short": "Laptop profesional de alto rendimiento",
    "description": "Descripción completa del producto...",
    "isActive": true,
    "isFeatured": true,
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "isPrimary": true,
        "sortOrder": 0
      }
    ],
    "specs": [
      {
        "label": "Procesador",
        "value": "Intel Core i7",
        "sortOrder": 0
      }
    ],
    "prices": [
      {
        "priceList": "minorista",
        "currency": "ARS",
        "netPrice": 450000,
        "taxRate": 21
      }
    ],
    "files": [
      {
        "type": "manual",
        "url": "https://example.com/manual.pdf"
      }
    ]
  }
]
```

Ejemplo con costo:

```json
{
  "sku": "G-02606",
  "title": "Gallagher M1200",
  "brand": "Gallagher",
  "category": "Energizadores",
  "cost": 3200,
  "costCurrency": "USD",
  "prices": [
    {
      "priceList": "minorista",
      "currency": "USD",
      "netPrice": 4337.048743,
      "taxRate": 0
    }
  ]
}
```

## Formato CSV

El formato CSV soporta los mismos campos, pero con algunas diferencias:

### Campos Simples

Los campos simples (`sku`, `title`, `brand`, `category`, `short`, `description`, `cost`, `costCurrency`, `isActive`, `isFeatured`) se mapean directamente a columnas del CSV.

### Campos Complejos (Arrays)

Para campos complejos (`images`, `specs`, `prices`, `files`), hay dos opciones:

#### Opción 1: JSON embebido (recomendado)

```csv
sku,title,images,specs
PROD-001,Producto 1,"[{""url"":""https://example.com/img.jpg"",""isPrimary"":true}]","[{""label"":""CPU"",""value"":""i7""}]"
```

#### Opción 2: Formato simplificado con separadores

**Imágenes:** Separadas por `|`, cada imagen es una URL:
```csv
images
https://example.com/img1.jpg|https://example.com/img2.jpg
```

**Especificaciones:** Separadas por `|`, cada spec es `label:value`:
```csv
specs
Procesador:Intel Core i7|RAM:16GB|Almacenamiento:512GB SSD
```

**Precios:** Separados por `|`, cada precio es `priceList:currency:netPrice:taxRate`:
```csv
prices
minorista:ARS:450000:21|mayorista:ARS:405000:21
```

**Archivos:** Separados por `|`, cada archivo es `type:url`:
```csv
files
manual:https://example.com/manual.pdf|ficha:https://example.com/ficha.pdf
```

### Ejemplo CSV Completo

```csv
sku,title,brand,category,short,isActive,isFeatured,images,specs,prices
PROD-001,Laptop Dell XPS 15,Dell,Computadoras,Laptop profesional,true,true,"[{""url"":""https://example.com/img.jpg"",""isPrimary"":true}]","[{""label"":""CPU"",""value"":""i7""}]","[{""priceList"":""minorista"",""currency"":""ARS"",""netPrice"":450000,""taxRate"":21}]"
```

## Comportamiento de Upsert

- Si un producto con el mismo `sku` ya existe, se **actualizará** con los nuevos datos.
- Si el `sku` no existe, se **creará** un nuevo producto.
- Las marcas y categorías se crean automáticamente si no existen (por nombre).
- Las relaciones existentes (imágenes, specs, precios, archivos) se eliminan y se recrean con los nuevos datos.

## Validación

Todos los productos se validan con Zod antes de procesarse. Los errores de validación se reportan en el resultado de la importación con:
- Número de fila
- SKU del producto (si está disponible)
- Mensaje de error descriptivo

## Ejemplos de Uso

### Importar desde JSON

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "x-admin-key: tu-clave-admin" \
  -F "file=@data/sample-products.json" \
  -F "format=json"
```

### Importar desde CSV

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "x-admin-key: tu-clave-admin" \
  -F "file=@data/sample-products.csv" \
  -F "format=csv"
```

### Desde la UI

1. Ve a `/admin/import`
2. Ingresa tu clave de administrador
3. Selecciona el formato (JSON o CSV)
4. Sube el archivo
5. Haz clic en "Importar Productos"

## Respuesta de Importación

La API devuelve un objeto con el siguiente formato:

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

- `created`: Número de productos creados
- `updated`: Número de productos actualizados
- `failed`: Número de productos que fallaron
- `errors`: Array de errores con detalles por fila
