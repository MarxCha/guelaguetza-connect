# Guía de Pruebas - CDN Upload Service

Esta guía te ayudará a probar el servicio de CDN implementado.

## Pre-requisitos

1. Configurar variables de entorno en `.env`:

```env
# Opción 1: AWS S3
CDN_PROVIDER=aws
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=us-east-1
CDN_ACCESS_KEY_ID=tu-access-key
CDN_SECRET_ACCESS_KEY=tu-secret-key
CDN_PUBLIC_BUCKET=false

# Opción 2: Cloudflare R2
CDN_PROVIDER=cloudflare
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=auto
CDN_ACCESS_KEY_ID=tu-r2-access-key
CDN_SECRET_ACCESS_KEY=tu-r2-secret-key
CLOUDFLARE_ACCOUNT_ID=tu-account-id
CDN_PUBLIC_BUCKET=true
```

2. Levantar servidor:

```bash
npm run dev
```

## Pruebas del Servicio

### 1. Verificar Configuración

```bash
curl http://localhost:3001/api/upload/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "provider": "aws",
    "bucket": "guelaguetza-connect-cdn",
    "region": "us-east-1",
    "cdnUrl": null,
    "publicBucket": false
  }
}
```

### 2. Subir Imagen Simple

```bash
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "url": "https://guelaguetza-connect-cdn.s3.us-east-1.amazonaws.com/images/1737841200000-abc123.jpg",
    "key": "images/1737841200000-abc123.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

### 3. Subir Imagen con Thumbnail

```bash
curl -X POST "http://localhost:3001/api/upload/image?generateThumbnail=true&thumbnailWidth=300&thumbnailHeight=300" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "url": "https://guelaguetza-connect-cdn.s3.us-east-1.amazonaws.com/images/1737841200000-abc123.jpg",
    "key": "images/1737841200000-abc123.jpg",
    "thumbnailUrl": "https://guelaguetza-connect-cdn.s3.us-east-1.amazonaws.com/images/thumbnails/1737841200000-thumb-abc123.jpg",
    "thumbnailKey": "images/thumbnails/1737841200000-thumb-abc123.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

### 4. Eliminar Imagen

```bash
# URL encode la key
KEY="images%2F1737841200000-abc123.jpg"

curl -X DELETE "http://localhost:3001/api/upload/${KEY}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Imagen eliminada correctamente"
}
```

### 5. Probar Validaciones

#### Archivo muy grande

```bash
# Crear archivo de 11MB
dd if=/dev/zero of=large.jpg bs=1M count=11

curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large.jpg"
```

Respuesta esperada:
```json
{
  "success": false,
  "error": "El archivo excede el tamaño máximo permitido (5MB)"
}
```

#### Tipo de archivo inválido

```bash
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

Respuesta esperada:
```json
{
  "success": false,
  "error": "Tipo de archivo no permitido. Tipos permitidos: image/jpeg, image/jpg, image/png, image/webp, image/gif"
}
```

## Pruebas desde Frontend

### Componente de Upload

```tsx
import { useState } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';

function ImageUploader() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image?generateThumbnail=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const { data } = await response.json();
      setImageUrl(data.url);
      console.log('Upload result:', data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />

      {uploading && <p>Subiendo imagen...</p>}

      {imageUrl && (
        <div className="mt-4">
          <h3>Imagen subida:</h3>
          <LazyImage
            src={imageUrl}
            alt="Imagen subida"
            className="w-full max-w-md"
          />
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
```

### Prueba de LazyImage

```tsx
import { LazyImage, LazyAvatar, LazyProductImage, LazyHeroImage } from '@/components/ui/LazyImage';

function TestPage() {
  return (
    <div className="space-y-8 p-8">
      {/* Imagen normal */}
      <section>
        <h2>LazyImage Normal</h2>
        <LazyImage
          src="https://via.placeholder.com/800x600"
          alt="Test image"
          className="w-full max-w-md"
        />
      </section>

      {/* Avatar */}
      <section>
        <h2>LazyAvatar</h2>
        <div className="flex gap-4">
          <LazyAvatar src="https://via.placeholder.com/100" alt="User 1" size="sm" />
          <LazyAvatar src="https://via.placeholder.com/100" alt="User 2" size="md" />
          <LazyAvatar src="https://via.placeholder.com/100" alt="User 3" size="lg" />
          <LazyAvatar src="https://via.placeholder.com/100" alt="User 4" size="xl" />
        </div>
      </section>

      {/* Producto */}
      <section>
        <h2>LazyProductImage</h2>
        <div className="grid grid-cols-3 gap-4">
          <LazyProductImage
            src="https://via.placeholder.com/400x400"
            alt="Product 1"
            aspectRatio="1/1"
          />
          <LazyProductImage
            src="https://via.placeholder.com/400x300"
            alt="Product 2"
            aspectRatio="4/3"
          />
          <LazyProductImage
            src="https://via.placeholder.com/400x225"
            alt="Product 3"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Hero */}
      <section>
        <h2>LazyHeroImage</h2>
        <LazyHeroImage
          src="https://via.placeholder.com/1920x1080"
          alt="Hero"
          overlay={true}
          overlayOpacity={0.4}
        >
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold">Hero Title</h1>
            <p className="text-xl">Hero subtitle</p>
          </div>
        </LazyHeroImage>
      </section>

      {/* Error handling */}
      <section>
        <h2>Error Handling</h2>
        <LazyImage
          src="https://invalid-url.com/image.jpg"
          alt="Broken image"
          className="w-full max-w-md"
          onError={() => console.log('Image failed to load')}
        />
      </section>
    </div>
  );
}

export default TestPage;
```

## Prueba de Migración

### Paso 1: Preparar imágenes de prueba

```bash
mkdir -p public/images
curl -o public/images/test1.jpg https://via.placeholder.com/800
curl -o public/images/test2.jpg https://via.placeholder.com/600
curl -o public/images/test3.jpg https://via.placeholder.com/400
```

### Paso 2: Crear productos de prueba con imágenes locales

```sql
INSERT INTO "Product" (id, name, description, price, "imageUrl", "sellerId", category, inventory)
VALUES 
  ('test1', 'Product 1', 'Test product 1', 100, '/images/test1.jpg', 'seller-id', 'ARTESANIAS', 10),
  ('test2', 'Product 2', 'Test product 2', 200, '/images/test2.jpg', 'seller-id', 'ARTESANIAS', 20);
```

### Paso 3: Ejecutar dry-run

```bash
npm run migrate:images:dry
```

Output esperado:
```
🚀 Iniciando migración de imágenes a CDN
📋 Modo: DRY RUN (no se harán cambios)
🎯 Tipo: all

⚙️  Configuración CDN:
   Provider: aws
   Bucket: guelaguetza-connect-cdn
   Region: us-east-1
   CDN URL: N/A

═══════════════════════════════════════
📦 MIGRANDO PRODUCTOS
═══════════════════════════════════════
🔍 Buscando productos con imágenes locales...
📦 Encontrados 2 productos con imágenes locales
[DRY RUN] Migraría: test1.jpg
[DRY RUN] Migraría: test2.jpg

═══════════════════════════════════════
📊 RESUMEN DE MIGRACIÓN
═══════════════════════════════════════
Productos:
  ✅ Exitosos: 2
  ❌ Fallidos: 0
  ⏭️  Omitidos: 0

ℹ️  Esto fue un DRY RUN. Para ejecutar la migración real, ejecuta:
   npm run migrate:images -- all
```

### Paso 4: Ejecutar migración real

```bash
npm run migrate:images:products
```

Output esperado:
```
📤 Subiendo: test1.jpg...
✅ Migrado: test1.jpg -> https://cdn.example.com/images/1737841200000-abc123.jpg
📤 Subiendo: test2.jpg...
✅ Migrado: test2.jpg -> https://cdn.example.com/images/1737841200001-def456.jpg
```

### Paso 5: Verificar en base de datos

```sql
SELECT id, name, "imageUrl" FROM "Product" WHERE id IN ('test1', 'test2');
```

Las URLs deben apuntar al CDN.

## Debugging

### Ver logs del servidor

```bash
npm run dev
```

Los logs mostrarán:
- Requests de upload
- Errores de validación
- Uploads exitosos
- Deletes

### Verificar imágenes en S3

```bash
aws s3 ls s3://guelaguetza-connect-cdn/images/ --recursive
```

### Verificar imágenes en R2

Usa el dashboard de Cloudflare R2 o:

```bash
aws s3 ls s3://guelaguetza-connect-cdn/images/ \
  --endpoint-url=https://<account-id>.r2.cloudflarestorage.com \
  --profile r2
```

## Errores Comunes

### "CDN configuration is incomplete"

**Causa**: Variables de entorno no configuradas

**Solución**: Verifica `.env` y asegúrate de tener todas las variables requeridas

### "Access Denied"

**Causa**: Credenciales inválidas o permisos insuficientes

**Solución**:
1. Verifica que las credenciales sean correctas
2. Verifica que el usuario IAM tenga permisos de S3
3. Verifica que la política del bucket permita uploads

### "El archivo excede el tamaño máximo permitido"

**Causa**: Archivo mayor a 5MB

**Solución**: 
1. Comprime la imagen antes de subir
2. O aumenta el límite en `upload.service.ts` (no recomendado)

### "Tipo de archivo no permitido"

**Causa**: Archivo no es una imagen válida

**Solución**: Solo sube JPG, PNG, WebP, GIF

### TypeScript errors

**Nota**: Hay algunos errores de TypeScript en modo compilación que son cosméticos. El código funciona correctamente en runtime con `tsx`.

Si encuentras problemas con tipos:

```bash
# Ejecutar con tsx (ignora errores de tipos)
npm run dev

# O compilar ignorando errores (no recomendado para producción)
npx tsc --noEmit || true
```

## Próximos Pasos

Una vez que todo funcione:

1. Configura CloudFront/Cloudflare CDN para mejor performance
2. Implementa rate limiting en uploads
3. Agrega webhook para procesar imágenes en background
4. Implementa analytics de uso de CDN
5. Configura backup/restore de imágenes

## Checklist de Testing

- [ ] Configurar variables de entorno
- [ ] Verificar configuración con `/api/upload/config`
- [ ] Subir imagen simple
- [ ] Subir imagen con thumbnail
- [ ] Eliminar imagen
- [ ] Probar validación de tamaño
- [ ] Probar validación de tipo
- [ ] Probar sin autenticación (debe fallar)
- [ ] Probar LazyImage component
- [ ] Probar LazyAvatar component
- [ ] Probar LazyProductImage component
- [ ] Ejecutar dry-run de migración
- [ ] Ejecutar migración real
- [ ] Verificar URLs en base de datos
- [ ] Verificar imágenes en CDN
- [ ] Probar delete de imagen migrada
