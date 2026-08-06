# Consultas comerciales del catálogo (`CommercialInquiry`)

## Concepto

Una **consulta comercial** es un lead del catálogo público. **No es una cotización**:
no incluye precios finales, envío, financiación ni condiciones confirmadas.

| Término UI | Código |
|------------|--------|
| Consulta comercial | `CommercialInquiry` / `CommercialInquiryItem` |
| Lista de consulta (cliente) | Zustand `catalog-inquiry-store` |

## Flujo actual (etapa 1)

1. El visitante arma una lista en el catálogo.
2. En `/catalogo/consulta` puede:
   - **Enviar por WhatsApp** (flujo previo, sin persistencia servidor).
   - **Solicitar contacto** → `POST /api/catalog/inquiries` → guarda en DB.
3. Tras éxito: confirmación visual + `referenceNumber` (`IFD-000123`) y se limpia la lista.

## API pública

`POST /api/catalog/inquiries`

- Sin autenticación.
- Valida con Zod (`lib/catalog-inquiry-schemas.ts`).
- Reconstruye snapshots de productos desde DB (`catalogVisible` + `isActive`).
- No lista ni permite consultar por número de referencia.
- Respuesta exitosa: `{ success: true, inquiry: { referenceNumber } }`.

### Protecciones anti-spam

| Medida | Detalle |
|--------|---------|
| Honeypot `website` | Si viene con valor → 200 falso sin persistir |
| Rate limit por IP | 8 req / 15 min in-memory (best-effort en serverless) |
| Máx. productos | 40 |
| Longitudes | Zod (nombre, teléfono, mensaje, etc.) |
| UI | lock + disable durante envío |

> El rate limit in-memory **no es global** entre instancias Vercel. Es una primera capa;
> para límites estrictos en producción convendrá Redis / Upstash u otro store compartido.

## Emails (etapa futura)

Stub: `lib/catalog-inquiry-notify.ts` → `sendNewInquiryNotification`.

Variables (ver `.env.example`):

- `BREVO_API_KEY`
- `INQUIRY_NOTIFICATION_FROM`
- `INQUIRY_NOTIFICATION_RECIPIENTS`

## Backoffice (etapa siguiente — no implementada)

Ruta UI recomendada:

- `/admin/catalog/inquiries` (listado)
- `/admin/catalog/inquiries/[id]` (detalle)

API admin recomendada:

- `GET /api/admin/catalog/inquiries`
- `GET /api/admin/catalog/inquiries/[id]`
- `PATCH /api/admin/catalog/inquiries/[id]` (status)

Permisos: misma puerta que el resto del admin (`requireAdminSession` /
`requireAdminPage`: usuario `APPROVED` + rol `ADMIN`).

No exponer listados ni detalle en rutas `/api/catalog/*` de lectura.

## Migración

```bash
npx prisma migrate deploy
# o en local de desarrollo:
npx prisma migrate dev
npx prisma generate
```

Archivo: `prisma/migrations/20260806180000_commercial_inquiries/migration.sql`
