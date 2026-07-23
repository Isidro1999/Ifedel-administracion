# Deploy — Catálogo público IFEDEL (`catalogo.ifedel.com`)

## Arquitectura

El catálogo vive en el **mismo proyecto Next.js** que el sistema interno de gestión.

| Capa | Detalle |
|------|---------|
| UI pública | `app/(catalogo)/catalogo/**` |
| API pública | `GET /api/catalog/*` (sin auth, whitelist de campos) |
| Admin publicación | `/admin/products/[id]/edit` → sección “Catálogo online” |
| Paths helper | `lib/catalog-paths.ts` → `catalogPath()` / `catalogAbsoluteUrl()` |
| Host rewrite | `middleware.ts` — solo si host es `catalogo.ifedel.com` |

El dominio principal del backoffice **no** se reescribe: el catálogo sigue accesible en `/catalogo` (útil en local y como fallback).

En el subdominio, el middleware:

1. Setea header `x-ifedel-catalog: 1`.
2. Reescribe `/` → `/catalogo`, `/productos` → `/catalogo/productos`, etc.
3. Redirige `/catalogo/*` → paths limpios (evita duplicación SEO).
4. **No toca** `/api/*`, `/_next/*`, `/brand/*`, favicon ni archivos con extensión.

`RootShell` omite `AuthGuard` / `AppShell` cuando hay host de catálogo o path `/catalogo/*`.

---

## Rutas locales (dominio principal / `localhost`)

| URL | Página |
|-----|--------|
| `/catalogo` | Home |
| `/catalogo/productos` | Listado |
| `/catalogo/productos/[slug]` | Detalle |
| `/catalogo/categorias/[slug]` | Categoría |
| `/catalogo/consulta` | Lista WhatsApp |

API (igual en todos los hosts):

- `GET /api/catalog/products`
- `GET /api/catalog/products/[slug]`
- `GET /api/catalog/categories`
- `GET /api/catalog/brands`

---

## Rutas en subdominio (`catalogo.ifedel.com`)

| URL pública | Internamente |
|-------------|--------------|
| `/` | `/catalogo` |
| `/productos` | `/catalogo/productos` |
| `/productos/[slug]` | `/catalogo/productos/[slug]` |
| `/categorias/[slug]` | `/catalogo/categorias/[slug]` |
| `/consulta` | `/catalogo/consulta` |

Los links de la UI usan `catalogPath()` / `useCatalogPath()` para emitir paths limpios en el subdominio y `/catalogo/...` en local.

Para simular el subdominio en local, podés agregar en `/etc/hosts`:

```text
127.0.0.1 catalogo.localhost
```

y abrir `http://catalogo.localhost:3000/` (el middleware reconoce `catalogo.localhost`).

---

## Variables en Vercel

### Catálogo

| Variable | Valor producción | Notas |
|----------|------------------|-------|
| `NEXT_PUBLIC_CATALOG_URL` | `https://catalogo.ifedel.com` | URLs absolutas (WhatsApp, preview admin) |
| `NEXT_PUBLIC_IFEDEL_WHATSAPP_NUMBER` | dígitos con país, sin `+` | Ej. `54911…` |

### Base de datos (Supabase)

| Variable | Requisito |
|----------|-----------|
| `DATABASE_URL` | Transaction Pooler (`:6543`) con `pgbouncer=true` y `connection_limit=1` |
| `DIRECT_URL` | Session Pooler (`:5432`) o Direct connection (migraciones) |

Si la password tiene `@`, `#`, `:`, etc., **debe ir URL-encoded** (`@` → `%40`).

No uses `file:./dev.db` en Vercel.

### Auth

| Variable | Notas |
|----------|-------|
| `AUTH_SECRET` | Obligatorio (Auth.js). Si el proyecto aún lee `NEXTAUTH_SECRET`, definir ambos con el mismo valor. |
| `AUTH_URL` | URL del **dominio principal** del backoffice (no el subdominio del catálogo). |
| `AUTH_TRUST_HOST` | `true` en Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth Google |

En Google Cloud Console, los redirect URIs deben apuntar al dominio principal (ej. `https://TU-DOMINIO/api/auth/callback/google`).

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

## Configurar dominio `catalogo.ifedel.com` en Vercel

1. En el proyecto de Vercel → **Settings → Domains**.
2. Agregar `catalogo.ifedel.com` (mismo deployment que el dominio principal).
3. En el DNS del dominio `ifedel.com`, crear un registro según indique Vercel:
   - **CNAME** a `cname.vercel-dns.com`, o
   - **A** a las IPs que muestre el panel.
4. Esperar propagación SSL (automática en Vercel).
5. Verificar variables de entorno (arriba) y redesplegar si cambiaste `NEXT_PUBLIC_*`.
6. Probar:
   - `https://catalogo.ifedel.com/`
   - `https://catalogo.ifedel.com/productos`
   - Una ficha `/productos/[slug]`
   - `/consulta`
   - Que el dominio principal siga pidiendo login en `/`, `/products`, `/admin`, etc.

No hace falta un proyecto Vercel separado: un solo app + middleware por host.

---

## Checklist QA producción

### Subdominio catálogo

- [ ] `/` carga home pública (sin shell interno / sin login).
- [ ] `/productos` lista solo productos `catalogVisible` + activos.
- [ ] `/productos/[slug]` muestra ficha y metadata correcta.
- [ ] `/categorias/[slug]` filtra por categoría.
- [ ] `/consulta` arma lista y abre WhatsApp con número correcto.
- [ ] Links internos quedan limpios (`/productos`, no `/catalogo/productos`).
- [ ] `/catalogo` en el subdominio redirige a `/` (sin duplicar).
- [ ] Imágenes Cloudinary y assets `/_next` cargan.
- [ ] `/api/catalog/products` responde 200 sin auth.

### Dominio principal (sistema interno)

- [ ] `/` sigue siendo el dashboard autenticado.
- [ ] `/catalogo` sigue funcionando como prefijo (opcional/fallback).
- [ ] `/api/products` y `/api/products/[id]` exigen sesión (401/redirect sin login).
- [ ] `/admin/*`, `/quotes`, `/sales`, `/finance`, etc. siguen protegidos.
- [ ] Login Google / Auth.js OK con `AUTH_URL` del dominio principal.

### Seguridad de datos públicos

- [ ] Respuestas `/api/catalog/*` **no** incluyen: `cost`, `costCurrency`, márgenes, proveedores, notas internas, precios internos completos, datos de clientes.
- [ ] Solo se ve precio público si `showPrice` + lista configurada; si no, “Consultar precio”.

### Build / ops

- [ ] `npm run build` OK.
- [ ] Sin logs ruidosos `[catalog.*]` en producción (solo development).
- [ ] `DATABASE_URL` con pooler + `pgbouncer=true`.

---

## Cómo probar en local

```bash
npm run dev
```

Abrir:

- http://localhost:3000/catalogo
- http://localhost:3000/catalogo/productos
- http://localhost:3000/catalogo/productos/[slug]
- http://localhost:3000/catalogo/categorias/[slug]
- http://localhost:3000/catalogo/consulta

Simular subdominio:

```bash
# /etc/hosts → 127.0.0.1 catalogo.localhost
open http://catalogo.localhost:3000/
open http://catalogo.localhost:3000/productos
```

Build:

```bash
npm run build
```

Migraciones (con `DIRECT_URL` válido):

```bash
npx prisma migrate deploy
```

---

## Riesgos pendientes

1. **Número de WhatsApp**: confirmar `NEXT_PUBLIC_IFEDEL_WHATSAPP_NUMBER` definitivo antes del go-live comercial.
2. **DNS / SSL**: propagación puede demorar; validar certificado en el subdominio.
3. **Cookies / auth en subdominio**: el catálogo es público; si en el futuro se compartiera sesión entre hosts, revisar `AUTH_URL` y dominio de cookies. Hoy no es necesario.
4. **Contenido**: productos sin `catalogVisible` / slug no aparecen; hace falta cargar contenido desde admin.
5. **SEO**: solo metadata básica; faltan sitemap, Open Graph por producto, canonical, etc.
6. **Pooler PgBouncer**: si fallan prepared statements, verificar `pgbouncer=true` y password URL-encoded.
7. **`NEXT_PUBLIC_*`**: cambios requieren redeploy; no se actualizan solo editando env en runtime ya buildeado.
8. **Duplicado `/catalogo` en dominio principal**: intencional para local; en producción el tráfico comercial debería ir al subdominio.

---

## Criterios de aceptación (Etapa 6)

- Local sigue bajo `/catalogo`.
- Subdominio preparado sin prefijo visible.
- Sistema interno intacto.
- `/api/*` no rotas por el rewrite de host.
- Admin protegido; catálogo público.
- Build OK.
- Deploy documentado en este archivo.
- Logs temporales de catálogo solo en development.
