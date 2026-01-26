# CDN Implementation - Guelaguetza Connect

Sistema completo de CDN para almacenar y servir assets estáticos con soporte para AWS S3 y Cloudflare R2.

## Ubicación de Archivos

```
guelaguetza-connect/
│
├── Backend
│   ├── src/
│   │   ├── services/upload.service.ts     # Servicio principal de CDN
│   │   ├── routes/upload.ts               # Endpoints API
│   │   ├── types/fastify.d.ts             # Tipos actualizados
│   │   └── app.ts                         # Registro de rutas
│   │
│   ├── scripts/
│   │   └── migrate-images.ts              # Script de migración
│   │
│   ├── CDN_SETUP_GUIDE.md                 # Setup AWS/Cloudflare
│   ├── CDN_TESTING_GUIDE.md               # Guía de testing
│   ├── .env.example                       # Variables de entorno
│   └── package.json                       # Scripts agregados
│
├── Frontend
│   └── components/ui/
│       ├── LazyImage.tsx                  # Componentes de lazy loading
│       └── LAZY_IMAGE_GUIDE.md            # Guía de uso
│
└── Documentación
    ├── CDN_QUICKSTART.md                  # ⭐ EMPIEZA AQUÍ
    ├── CDN_IMPLEMENTATION_SUMMARY.md      # Resumen técnico
    └── CDN_FILES_SUMMARY.md               # Índice de archivos
```

## Quick Start

### 1. Configurar Cloudflare R2

```bash
# 1. Crear bucket en Cloudflare R2
# 2. Generar API tokens
# 3. Configurar .env

# backend/.env
CDN_PROVIDER=cloudflare
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=auto
CDN_ACCESS_KEY_ID=tu_access_key
CDN_SECRET_ACCESS_KEY=tu_secret_key
CLOUDFLARE_ACCOUNT_ID=tu_account_id
CDN_PUBLIC_BUCKET=true
```

### 2. Probar Upload

```bash
cd backend
npm run dev

# En otra terminal
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image.jpg"
```

### 3. Usar en Frontend

```tsx
import { LazyImage } from '@/components/ui/LazyImage';

<LazyImage src={cdnUrl} alt="Mi imagen" />
```

## API Endpoints

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/upload/image` | POST | Sube imagen | ✓ |
| `/api/upload/:key` | DELETE | Elimina imagen | ✓ |
| `/api/upload/config` | GET | Config CDN | ✓ |

## Componentes Frontend

| Componente | Uso | Props Clave |
|------------|-----|-------------|
| `LazyImage` | Imágenes generales | `src`, `alt`, `blur` |
| `LazyAvatar` | Avatares de usuario | `size: sm/md/lg/xl` |
| `LazyProductImage` | Productos | `aspectRatio: 1/1, 4/3, 16/9` |
| `LazyHeroImage` | Banners/Heroes | `overlay`, `overlayOpacity` |
| `LazyImageGrid` | Grids de imágenes | `columns`, `gap` |

## Scripts NPM

```bash
npm run migrate:images:dry     # Dry-run migración
npm run migrate:images         # Migrar todas las imágenes
npm run migrate:images:products # Solo productos
npm run migrate:images:events  # Solo eventos
```

## Características

- ✅ **Multi-provider**: AWS S3, Cloudflare R2
- ✅ **Optimización automática**: JPEG, PNG, WebP
- ✅ **Thumbnails**: Generación con sharp
- ✅ **Lazy loading**: IntersectionObserver API
- ✅ **Cache**: Headers optimizados (1 año)
- ✅ **Validación**: Tipo MIME y tamaño
- ✅ **Seguridad**: JWT authentication
- ✅ **Migración**: Script automatizado

## Documentación

| Documento | Descripción | Para quién |
|-----------|-------------|------------|
| `CDN_QUICKSTART.md` | Inicio rápido | Todos |
| `backend/CDN_SETUP_GUIDE.md` | Setup detallado | DevOps |
| `backend/CDN_TESTING_GUIDE.md` | Testing | QA/Dev |
| `components/ui/LAZY_IMAGE_GUIDE.md` | Uso de componentes | Frontend |
| `CDN_IMPLEMENTATION_SUMMARY.md` | Detalles técnicos | Backend |

## Estadísticas

- **Archivos nuevos**: 9
- **Archivos modificados**: 4
- **Código TypeScript**: ~636 líneas
- **Código React**: ~280 líneas
- **Documentación**: ~2500 líneas

## Costos Estimados

| Provider | Storage | Requests | Transfer | Total/mes |
|----------|---------|----------|----------|-----------|
| Cloudflare R2 | $1.50 | $5 | $0 | ~$6.50 |
| AWS S3 + CloudFront | $2.30 | $5 | $8.50 | ~$16 |

*Basado en 100GB storage + 1M requests/mes*

## Soporte

- Issues técnicos: Ver `CDN_TESTING_GUIDE.md` > Troubleshooting
- Setup: Ver `CDN_SETUP_GUIDE.md`
- Uso: Ver `CDN_QUICKSTART.md`

## Próximos Pasos

1. [ ] Configurar proveedor CDN (Cloudflare R2 o AWS S3)
2. [ ] Agregar variables de entorno
3. [ ] Probar upload de imagen
4. [ ] Integrar LazyImage en componentes existentes
5. [ ] Migrar imágenes de `/public/images`
6. [ ] (Opcional) Configurar custom domain
7. [ ] (Opcional) Configurar CloudFront/Cloudflare CDN

## Ejemplo Mínimo

```tsx
// Backend: Upload
const result = await uploadService.uploadImage(
  buffer,
  'image.jpg',
  'image/jpeg',
  { generateThumbnail: true }
);
// result.url = "https://cdn.example.com/images/123-abc.jpg"

// Frontend: Display
import { LazyImage } from '@/components/ui/LazyImage';

<LazyImage src={result.url} alt="Producto" />
```

---

**Implementado**: Enero 2026  
**Versión**: 1.0.0  
**Mantenedor**: Equipo Guelaguetza Connect
