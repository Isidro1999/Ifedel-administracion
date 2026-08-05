# Deploy — Catálogo público IFEDEL (`ifedel.com`)

## Arquitectura

El catálogo vive en el **mismo proyecto Next.js** que el sistema interno de gestión.

| Capa | Detalle |
|------|---------|
| UI pública | `app/(catalogo)/catalogo/**` |
| API pública | `GET /api/catalog/*` (sin auth, whitelist de campos) |
| Admin publicación | `/admin/products/[id]/edit` → sección “Catálogo online” |
| Paths helper | `lib/catalog-paths.ts` → `catalogPath()` / `catalogAbsoluteUrl()` |
| Host rewrite | `middleware.ts` — `ifedel.com` y `catalogo.localhost` |
| Host redirects | `catalogo.ifedel.com`, `www.catalogo.ifedel.com`, `www.ifedel.com` → `https://ifedel.com` (308) |
| Backoffice | `app.ifedel.com` (no es host de catálogo) |

| Host | Comportamiento |
|------|----------------|
| `ifedel.com` | Catálogo con paths limpios (`/`, `/productos`, …) |
| `www.ifedel.com` | 308 → `https://ifedel.com` + path/query |
| `catalogo.ifedel.com` | 308 → `https://ifedel.com` + path/query (legacy) |
| `app.ifedel.com` | Solo backoffice / auth |
| `*.vercel.app` / `localhost` | Prefijo `/catalogo` (preview y local) |
| `catalogo.localhost` | Simulación local de paths limpios |

En el host catálogo, el middleware:

1. Setea header `x-ifedel-catalog: 1`.
2. Reescribe `/` → `/catalogo`, `/productos` → `/catalogo/productos`, etc.
3. Redirige `/catalogo/*` → paths limpios (evita duplicación SEO).
4. **No toca** `/api/*`, `/_next/*`, `/brand/*`, favicon ni archivos con extensión.

`RootShell` omite `AuthGuard` / `AppShell` cuando hay host de catálogo o path `/catalogo/*`.

Canonical / OG de la home: `https://ifedel.com/`.

---

## Rutas locales (dominio principal / `localhost` / Preview)

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

## Rutas en `ifedel.com`

| URL pública | Internamente |
|-------------|--------------|
| `/` | `/catalogo` |
| `/productos` | `/catalogo/productos` |
| `/productos/[slug]` | `/catalogo/productos/[slug]` |
| `/categorias/[slug]` | `/catalogo/categorias/[slug]` |
| `/consulta` | `/catalogo/consulta` |

Los links de la UI usan `catalogPath()` / `useCatalogPath()` para emitir paths limpios en el host catálogo y `/catalogo/...` en local/preview.

Para simular el host catálogo en local, podés agregar en `/etc/hosts`:

```text
127.0.0.1 catalogo.localhost
```

y abrir `http://catalogo.localhost:3000/` (el middleware reconoce `catalogo.localhost`).

Para probar redirects de host (sin DNS):

```bash
curl -sI -H "Host: catalogo.ifedel.com" "http://127.0.0.1:3000/productos?x=1"
# → 308 Location: https://ifedel.com/productos?x=1

curl -sI -H "Host: www.ifedel.com" "http://127.0.0.1:3000/consulta"
# → 308 Location: https://ifedel.com/consulta

curl -sI -H "Host: ifedel.com" "http://127.0.0.1:3000/productos"
# → 200 (rewrite interno a /catalogo/productos)
```

---

## Variables en Vercel

### Catálogo

| Variable | Valor producción | Notas |
|----------|------------------|-------|
| `NEXT_PUBLIC_CATALOG_URL` | `https://ifedel.com` | URLs absolutas (WhatsApp, preview admin, canonical fallback) |
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
| `AUTH_URL` | URL del **backoffice**: `https://app.ifedel.com` |
| `AUTH_TRUST_HOST` | `true` en Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth Google |

En Google Cloud Console, los redirect URIs deben apuntar al backoffice:

- `https://app.ifedel.com/api/auth/callback/google`

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

## Configurar dominios en Vercel (cuando se apruebe DNS)

**Todavía no cambiar DNS hasta deploy + aprobación.** Cuando corresponda:

1. Proyecto Vercel → **Settings → Domains**.
2. Agregar / verificar:
   - `ifedel.com` (catálogo apex)
   - `www.ifedel.com` (puede ser Domain Redirect a `ifedel.com` en Vercel **o** dejar que el middleware haga 308)
   - `app.ifedel.com` (backoffice; ya debería existir)
   - `catalogo.ifedel.com` (mantener el dominio apuntando al mismo proyecto para que el 308 del middleware funcione; no hace falta un proyecto separado)
3. Actualizar `NEXT_PUBLIC_CATALOG_URL=https://ifedel.com` y redesplegar.
4. Probar:
   - `https://ifedel.com/`
   - `https://ifedel.com/productos`
   - `https://catalogo.ifedel.com/productos` → 308 → `https://ifedel.com/productos`
   - `https://www.ifedel.com/` → 308 → `https://ifedel.com/`
   - `https://app.ifedel.com/` → login / dashboard
   - Preview `*.vercel.app/catalogo` sigue con prefijo

No hace falta un proyecto Vercel separado: un solo app + middleware por host.

### DNS (GoDaddy / proveedor) — guía, sin aplicar aún

| Registro | Acción futura | Notas |
|----------|---------------|-------|
| `ifedel.com` (A / ALIAS / ANAME hacia Vercel) | Apuntar al proyecto IFEDEL | Host canónico del catálogo |
| `www` | CNAME a Vercel **o** redirect a apex | Evitar loop con middleware |
| `app` | Mantener CNAME/A actual a Vercel | Backoffice; **no** redirigir a ifedel.com |
| `catalogo` | Mantener apuntando a Vercel | Solo para 308 legacy → ifedel.com |
| MX / TXT email / SPF / DKIM | **No tocar** | Correo independiente del catálogo |
| Otros subdominios no listados | **No tocar** | |

Si hoy `ifedel.com` apunta a otro sitio (WordPress, etc.), planificar cutover y TTL bajo antes del cambio.

---

## SEO futuro (no implementado en esta etapa)

Cuando se agreguen:

- `https://ifedel.com/robots.txt`
- `https://ifedel.com/sitemap.xml`

Nunca declarar `catalogo.ifedel.com` como canonical.

---

## Checklist QA producción

### Catálogo (`ifedel.com`)

- [ ] `/` carga home pública (sin shell interno / sin login).
- [ ] `/productos` lista solo productos `catalogVisible` + activos.
- [ ] `/productos/[slug]` muestra ficha y metadata correcta.
- [ ] `/categorias/[slug]` filtra por categoría.
- [ ] `/consulta` arma lista y abre WhatsApp con número correcto.
- [ ] Links internos quedan limpios (`/productos`, no `/catalogo/productos`).
- [ ] `/catalogo` en el host catálogo redirige a `/` (sin duplicar).
- [ ] Canonical / OG apuntan a `https://ifedel.com/`.
- [ ] Imágenes Cloudinary y assets `/_next` cargan.
- [ ] `/api/catalog/products` responde 200 sin auth.

### Redirects

- [ ] `catalogo.ifedel.com/*` → 308 `https://ifedel.com/*` (path + query).
- [ ] `www.ifedel.com/*` → 308 `https://ifedel.com/*`.
- [ ] Sin cadenas innecesarias ni loops.

### Backoffice (`app.ifedel.com`)

- [ ] `/` sigue siendo el dashboard autenticado.
- [ ] `/api/products` y `/api/products/[id]` exigen sesión.
- [ ] `/admin/*`, `/quotes`, `/sales`, `/finance`, etc. siguen protegidos.
- [ ] Login Google / Auth.js OK con `AUTH_URL=https://app.ifedel.com`.

### Preview / local

- [ ] `*.vercel.app/catalogo` y `/catalogo/productos` funcionan con prefijo.
- [ ] `localhost:3000/catalogo` funciona.
- [ ] `catalogo.localhost:3000/` simula paths limpios.

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

Simular host catálogo:

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
2. **DNS / SSL / cutover de ifedel.com**: si el apex hoy sirve otro sitio, coordinar migración.
3. **Cookies / auth**: `AUTH_URL` debe seguir en `app.ifedel.com`; el catálogo es público.
4. **Contenido**: productos sin `catalogVisible` / slug no aparecen.
5. **SEO**: faltan sitemap / robots; canonical de home ya apunta a `ifedel.com`.
6. **Pooler PgBouncer**: verificar `pgbouncer=true` y password URL-encoded.
7. **`NEXT_PUBLIC_*`**: cambios requieren redeploy.
8. **Duplicado `/catalogo` en preview/local**: intencional; tráfico comercial en producción va a `ifedel.com`.
