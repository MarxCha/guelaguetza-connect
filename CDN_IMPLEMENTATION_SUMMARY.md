# Resumen de Implementación: CDN para Assets Estáticos

## Descripción General

Sistema completo de CDN para almacenar y servir imágenes estáticas en el proyecto Guelaguetza Connect. Soporta AWS S3 con CloudFront y Cloudflare R2.

## Archivos Creados

### Backend

1. **`backend/src/services/upload.service.ts`**
   - Servicio principal para upload de imágenes
   - Soporte para AWS S3 y Cloudflare R2
   - Optimización automática de imágenes con sharp
   - Generación de thumbnails
   - Validación de tipos y tamaños
   - Cache headers optimizados

2. **`backend/src/routes/upload.ts`**
   - POST `/api/upload/image` - Subir imagen
   - DELETE `/api/upload/:key` - Eliminar imagen
   - GET `/api/upload/config` - Obtener configuración
   - Autenticación requerida en todos los endpoints

3. **`backend/scripts/migrate-images.ts`**
   - Script para migrar imágenes existentes de `/public/images` al CDN
   - Soporta migración de productos y eventos
   - Modo dry-run para testing
   - Actualización automática de referencias en BD

4. **`backend/CDN_SETUP_GUIDE.md`**
   - Guía completa de configuración
   - Instrucciones para AWS S3 y Cloudflare R2
   - Políticas de bucket y CORS
   - Ejemplos de uso
   - Troubleshooting

### Frontend

5. **`components/ui/LazyImage.tsx`**
   - Componente base LazyImage con Intersection Observer
   - LazyAvatar para perfiles
   - LazyProductImage con aspect ratio
   - LazyHeroImage con overlay
   - LazyImageGrid para grids
   - Transiciones suaves y blur effect
   - Fallbacks de error

6. **`components/ui/LAZY_IMAGE_GUIDE.md`**
   - Guía de uso del componente LazyImage
   - Ejemplos de todas las variantes
   - Best practices
   - Integración con CDN

### Configuración

7. **`backend/.env.example`** (actualizado)
   - Variables de entorno para CDN
   - Configuración AWS y Cloudflare

8. **`backend/package.json`** (actualizado)
   - Scripts de migración de imágenes
   - `npm run migrate:images` - Migrar todas
   - `npm run migrate:images:dry` - Dry run
   - `npm run migrate:images:products` - Solo productos
   - `npm run migrate:images:events` - Solo eventos

9. **`backend/src/app.ts`** (actualizado)
   - Registro de plugin multipart
   - Registro de rutas de upload
   - Endpoint `/api/upload` agregado

## Características Implementadas

### Upload Service

- **Proveedores soportados**: AWS S3, Cloudflare R2
- **Validación**: Tipo MIME, tamaño, formato de imagen
- **Optimización automática**:
  - JPEG: Calidad 85%, progresivo
  - PNG: Compresión nivel 9
  - WebP: Calidad 85%
- **Thumbnails**: Generación opcional con sharp
- **Cache headers**: `max-age=31536000, immutable` (1 año)
- **Seguridad**: Validación de archivo real con sharp

### Upload API

- **Autenticación**: JWT required
- **Rate limiting**: Configurado con plugin
- **Multipart**: Hasta 10MB por archivo, máximo 5 archivos
- **Query params**: generateThumbnail, thumbnailWidth, thumbnailHeight
- **Responses**: URLs públicas del CDN

### LazyImage Component

- **Lazy loading**: IntersectionObserver API
- **Placeholders**: SVG inline mientras carga
- **Fallbacks**: Imagen de error con icono
- **Transitions**: Blur effect y fade in
- **Variantes**: Avatar, Product, Hero, Grid
- **Dark mode**: Soporte completo
- **Accesibilidad**: Alt text, semántica HTML

### Migration Script

- **Tipos**: Productos, eventos, o todo
- **Dry run**: Testing sin cambios
- **Progress**: Logs detallados de cada imagen
- **Error handling**: Continúa en errores, reporta al final
- **BD update**: Actualiza URLs automáticamente

## Configuración Requerida

### Variables de Entorno

#### Para AWS S3:

```env
CDN_PROVIDER=aws
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=us-east-1
CDN_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
CDN_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
CDN_URL=https://d1234567890.cloudfront.net  # Opcional
CDN_PUBLIC_BUCKET=false
```

#### Para Cloudflare R2:

```env
CDN_PROVIDER=cloudflare
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=auto
CDN_ACCESS_KEY_ID=your-r2-access-key-id
CDN_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_ACCOUNT_ID=your-account-id
CDN_URL=https://cdn.guelaguetzaconnect.com  # Opcional
CDN_PUBLIC_BUCKET=true
```

## Uso Rápido

### Backend: Subir Imagen

```typescript
import { uploadService } from './services/upload.service.js';

const buffer = await file.toBuffer();
const result = await uploadService.uploadImage(
  buffer,
  'product.jpg',
  'image/jpeg',
  { generateThumbnail: true }
);

console.log(result.url); // https://cdn.example.com/images/1234567890-abc123.jpg
```

### Frontend: Mostrar Imagen

```tsx
import { LazyImage, LazyAvatar, LazyProductImage } from '@/components/ui/LazyImage';

// Imagen normal
<LazyImage src={imageUrl} alt="Descripción" />

// Avatar
<LazyAvatar src={avatarUrl} alt="Usuario" size="md" />

// Producto
<LazyProductImage src={productUrl} alt="Producto" aspectRatio="4/3" />
```

### API: Upload desde Cliente

```bash
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F "generateThumbnail=true"
```

### Migrar Imágenes Existentes

```bash
# Dry run primero
npm run migrate:images:dry

# Migrar todo
npm run migrate:images

# Solo productos
npm run migrate:images:products
```

## Flujo de Trabajo Típico

1. **Usuario sube imagen desde el frontend**
   ```tsx
   const handleUpload = async (file: File) => {
     const formData = new FormData();
     formData.append('file', file);
     
     const response = await fetch('/api/upload/image?generateThumbnail=true', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${token}` },
       body: formData,
     });
     
     const { data } = await response.json();
     return data.url; // URL del CDN
   };
   ```

2. **Backend valida y optimiza**
   - Verifica tipo MIME
   - Verifica tamaño
   - Optimiza con sharp
   - Genera thumbnail (opcional)

3. **Sube a CDN**
   - S3 o R2
   - Headers de cache optimizados
   - ACL público

4. **Retorna URL**
   - URL del CDN o CloudFront
   - URL del thumbnail (si aplica)

5. **Frontend muestra con LazyImage**
   ```tsx
   <LazyImage src={data.url} alt="Mi imagen" />
   ```

## Optimizaciones Implementadas

### Servidor

1. **Compresión de imágenes**
   - JPEG progresivo
   - PNG nivel 9
   - WebP optimizado

2. **Cache headers**
   - 1 año de TTL
   - Immutable flag
   - Public cache

3. **Validación eficiente**
   - Sharp metadata
   - MIME type check
   - File size limit

### Cliente

1. **Lazy loading**
   - IntersectionObserver
   - Threshold configurable
   - Root margin pre-carga

2. **Placeholders**
   - SVG inline (cero latencia)
   - Blur effect
   - Skeleton loading

3. **Error handling**
   - Fallback images
   - Error callbacks
   - UI feedback

## Costos Estimados

### AWS S3 + CloudFront
- 100GB storage: ~$2.30/mes
- 1M requests: ~$5/mes
- 100GB transfer: ~$8.50/mes
- **Total**: ~$16/mes

### Cloudflare R2
- 100GB storage: ~$1.50/mes
- 1M requests: ~$5/mes
- Transfer: $0 (sin egress fees)
- **Total**: ~$6.50/mes

## Seguridad

- JWT authentication en todos los endpoints
- Rate limiting configurado
- Validación de tipo MIME
- Validación de archivo real con sharp
- Límites de tamaño configurables
- CORS configurado
- Buckets con políticas restringidas

## Testing

### Test Upload Service

```typescript
import { uploadService } from './services/upload.service';

describe('UploadService', () => {
  it('should upload image', async () => {
    const buffer = Buffer.from('fake image data');
    const result = await uploadService.uploadImage(
      buffer,
      'test.jpg',
      'image/jpeg'
    );
    expect(result.url).toBeDefined();
  });
});
```

### Test LazyImage Component

```tsx
import { render, screen } from '@testing-library/react';
import { LazyImage } from '@/components/ui/LazyImage';

test('renders with alt text', () => {
  render(<LazyImage src="test.jpg" alt="Test" />);
  expect(screen.getByAltText('Test')).toBeInTheDocument();
});
```

## Monitoreo

### Métricas Recomendadas

1. Upload rate (images/hour)
2. Upload size (MB/hour)
3. Error rate (%)
4. Average upload time (ms)
5. CDN bandwidth (GB/day)
6. Storage used (GB)

### Logs

```typescript
// El servicio automáticamente logea
app.log.info('Image uploaded', { key, size, mimeType });
app.log.error('Upload failed', { error, file });
```

## Próximos Pasos

1. **Implementar signed URLs** para contenido privado
2. **Agregar image resizing on-the-fly** con Lambda@Edge o Cloudflare Workers
3. **Implementar CDN purging** para actualizar imágenes
4. **Agregar analytics** de uso de imágenes
5. **Implementar Progressive Web App** con service workers para cache offline
6. **Agregar soporte para video** (similar flow)

## Troubleshooting

### Error: "CDN configuration is incomplete"
- Verifica variables de entorno en `.env`
- Asegúrate de tener todas las credenciales

### Error: "Access Denied"
- Verifica permisos IAM (AWS)
- Verifica API token (Cloudflare)
- Verifica bucket policy

### Imágenes no se cargan
- Verifica CORS configuration
- Verifica que bucket sea público
- Verifica URL del CDN

### LazyImage no lazy-loads
- Verifica soporte de IntersectionObserver
- Verifica threshold y rootMargin
- Revisa consola para errores

## Referencias

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

## Soporte

Para preguntas o issues, consulta:
- `backend/CDN_SETUP_GUIDE.md` - Configuración de CDN
- `components/ui/LAZY_IMAGE_GUIDE.md` - Uso del componente
- Este archivo - Resumen general
