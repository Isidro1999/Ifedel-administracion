# Consultas comerciales del catálogo (`CommercialInquiry`)

## Concepto

Una **consulta comercial** es un lead del catálogo público. **No es una cotización**:
no incluye precios finales, envío, financiación ni condiciones confirmadas.

| Término UI | Código |
|------------|--------|
| Consulta comercial | `CommercialInquiry` / `CommercialInquiryItem` |
| Lista de consulta (cliente) | Zustand `catalog-inquiry-store` |

## Flujo (etapas 1–3)

1. El visitante arma una lista en el catálogo.
2. En `/catalogo/consulta` puede:
   - **Enviar por WhatsApp** (sin persistencia servidor).
   - **Solicitar contacto** → `POST /api/catalog/inquiries` → guarda en DB.
3. Tras éxito: confirmación visual + `referenceNumber` (`IFD-000123`).
4. Aviso interno por email a IFEDEL vía Brevo (best-effort; no bloquea el guardado).
5. La consulta aparece en `/admin/catalog/inquiries`.

## API pública

`POST /api/catalog/inquiries`

- Sin autenticación.
- Valida con Zod (`lib/catalog-inquiry-schemas.ts`).
- Reconstruye snapshots de productos desde DB (`catalogVisible` + `isActive`).
- No lista ni permite consultar por número de referencia.
- Respuesta exitosa: `{ success: true, inquiry: { referenceNumber } }`.
- **No** expone si el email se envió, destinatarios ni `messageId` de Brevo.

### Protecciones anti-spam

| Medida | Detalle |
|--------|---------|
| Honeypot `website` | Si viene con valor → 200 falso sin persistir |
| Rate limit por IP | 8 req / 15 min in-memory (best-effort en serverless) |
| Máx. productos | 40 |
| Longitudes | Zod (nombre, teléfono, mensaje, etc.) |
| UI | lock + disable durante envío |

> El rate limit in-memory **no es global** entre instancias Vercel.

## Emails internos (etapa 3 — Brevo)

Servicio: `lib/catalog-inquiry-notify.ts` → `sendNewInquiryNotification(inquiryId)`.

Builders puros (escape HTML, asunto, HTML, texto): `lib/catalog-inquiry-email.ts`.

Integración: `fetch` a `POST https://api.brevo.com/v3/smtp/email` (sin SDK). Timeout 8s.

### Principio de resiliencia

1. Se confirma la consulta en DB.
2. Se intenta el email.
3. Si Brevo falla / falta config → se loguea, **no** hay rollback, el cliente recibe éxito igual.

### Variables (ver `.env.example`)

| Variable | Uso |
|----------|-----|
| `BREVO_API_KEY` | Obligatoria para enviar |
| `INQUIRY_NOTIFICATION_FROM` | Remitente email (`info@ifedel.com`) |
| `INQUIRY_NOTIFICATION_FROM_NAME` | Nombre (`IFEDEL`) |
| `INQUIRY_NOTIFICATION_RECIPIENTS` | Lista separada por comas |
| `NEXT_PUBLIC_BACKOFFICE_URL` | Base CTA (`https://app.ifedel.com`); fallback `AUTH_URL` |

Reply-To = email del cliente si es válido. Tag Brevo: `catalog-inquiry`.

Sin `BREVO_API_KEY` o sin destinatarios válidos: `sent: false` (`disabled` / `configuration_error`) y se puede crear consultas en local.

### Configurar Brevo (manual)

1. Entrar a [Brevo](https://www.brevo.com/).
2. Crear una **API key** con permiso de envío transaccional.
3. Registrar el remitente `info@ifedel.com` (Senders).
4. Autenticar el dominio `ifedel.com` (DKIM / DMARC / registros que Brevo indique — **usar los valores exactos del panel**, no inventarlos).
5. Esperar validación DNS (puede no ser inmediata).
6. En Vercel → Project → Settings → Environment Variables (Production):
   - `BREVO_API_KEY`
   - `INQUIRY_NOTIFICATION_FROM=info@ifedel.com`
   - `INQUIRY_NOTIFICATION_FROM_NAME=IFEDEL`
   - `INQUIRY_NOTIFICATION_RECIPIENTS=isidroballestrin@gmail.com,jeroanchelerguez@gmail.com`
   - `NEXT_PUBLIC_BACKOFFICE_URL=https://app.ifedel.com`
7. Redeploy.
8. Enviar una consulta real desde el catálogo (con email de prueba en el formulario).
9. Revisar Transactional → Email logs en Brevo.
10. Confirmar recepción en ambas casillas y Reply-To del cliente.

Para pruebas locales, apuntá `INQUIRY_NOTIFICATION_RECIPIENTS` a casillas propias (no hardcodear producción en `.env` local).

### Deuda futura

- Confirmación por email al cliente.
- Cola / reintentos persistentes (hoy es síncrono best-effort con timeout).
- Webhooks de entrega, historial de emails, reenvío manual desde el backoffice.

## Backoffice (etapa 2)

Rutas UI:

- `/admin/catalog/inquiries` — listado con filtros, paginación y contador de `NEW`
- `/admin/catalog/inquiries/[id]` — detalle, contacto y cambio de estado

API admin:

- `GET /api/admin/catalog/inquiries`
- `GET /api/admin/catalog/inquiries/[id]`
- `PATCH /api/admin/catalog/inquiries/[id]` — body `{ status }` únicamente

Permisos: `requireAdminSession` / `requireAdminPage` (usuario `APPROVED` + rol `ADMIN`).

Capa de datos: `lib/admin-catalog-inquiries.ts`.

### Decisiones

- **Transiciones de estado:** libres (cualquier estado → cualquier otro).
- **Badge en sidebar:** no implementado; contador `NEW` en el listado.
- Sin eliminación / notas / historial de cambios / cotizaciones.

## Migración

```bash
npx prisma migrate deploy
npx prisma generate
```

Archivo: `prisma/migrations/20260806180000_commercial_inquiries/migration.sql`
