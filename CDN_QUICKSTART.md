# CDN Quick Start Guide

Guía rápida para empezar a usar el CDN en Guelaguetza Connect.

## Setup Rápido (5 minutos)

### 1. Elige tu proveedor CDN

**Opción A: Cloudflare R2** (Recomendado - Más económico)
- Sin costos de egress
- ~$6.50/mes para 100GB + 1M requests
- Setup más simple

**Opción B: AWS S3 + CloudFront**
- Más robusto para enterprise
- ~$16/mes para 100GB + 1M requests
- Más opciones de configuración

### 2. Configuración de Cloudflare R2 (Recomendado)

1. Ve a Cloudflare Dashboard > R2 Object Storage
2. Crea un bucket: `guelaguetza-connect-cdn`
3. Habilita "Public Access" en configuración
4. Ve a "Manage R2 API Tokens" y crea uno nuevo con permisos:
   - Object Read
   - Object Write
   - Object Delete
5. Guarda:
   - Access Key ID
   - Secret Access Key
   - Account ID

### 3. Configurar Variables de Entorno

Edita `backend/.env`:

```env
# CDN Configuration - Cloudflare R2
CDN_PROVIDER=cloudflare
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=auto
CDN_ACCESS_KEY_ID=tu_access_key_aqui
CDN_SECRET_ACCESS_KEY=tu_secret_key_aqui
CLOUDFLARE_ACCOUNT_ID=tu_account_id_aqui
CDN_PUBLIC_BUCKET=true
```

### 4. Probar el Upload

```bash
# Iniciar servidor
cd backend
npm run dev

# En otra terminal, probar upload
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-image.jpg"
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "url": "https://pub-xxxxx.r2.dev/images/1737841200000-abc123.jpg",
    "key": "images/1737841200000-abc123.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

### 5. Usar en el Frontend

```tsx
import { LazyImage } from '@/components/ui/LazyImage';

function MyComponent() {
  return (
    <LazyImage
      src="https://pub-xxxxx.r2.dev/images/1737841200000-abc123.jpg"
      alt="Mi imagen"
      className="w-full rounded-lg"
    />
  );
}
```

## Endpoints Disponibles

### POST /api/upload/image
Sube una imagen al CDN.

**Query Parameters:**
- `generateThumbnail=true` - Generar thumbnail 300x300
- `thumbnailWidth=400` - Ancho del thumbnail
- `thumbnailHeight=300` - Alto del thumbnail

**Ejemplo:**
```bash
curl -X POST "http://localhost:3001/api/upload/image?generateThumbnail=true" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image.jpg"
```

### DELETE /api/upload/:key
Elimina una imagen del CDN.

**Ejemplo:**
```bash
curl -X DELETE "http://localhost:3001/api/upload/images%2F1737841200000-abc123.jpg" \
  -H "Authorization: Bearer TOKEN"
```

### GET /api/upload/config
Obtiene la configuración del CDN.

**Ejemplo:**
```bash
curl http://localhost:3001/api/upload/config \
  -H "Authorization: Bearer TOKEN"
```

## Componentes Frontend

### LazyImage (Base)
```tsx
<LazyImage
  src={imageUrl}
  alt="Descripción"
  className="w-full h-auto"
/>
```

### LazyAvatar
```tsx
<LazyAvatar
  src={avatarUrl}
  alt="Usuario"
  size="md" // sm, md, lg, xl
/>
```

### LazyProductImage
```tsx
<LazyProductImage
  src={productUrl}
  alt="Producto"
  aspectRatio="4/3" // 1/1, 4/3, 16/9, 3/4
/>
```

### LazyHeroImage
```tsx
<LazyHeroImage
  src={heroUrl}
  alt="Banner"
  overlay={true}
  overlayOpacity={0.5}
>
  <h1>Título sobre la imagen</h1>
</LazyHeroImage>
```

## Migrar Imágenes Existentes

Si tienes imágenes en `/public/images`:

```bash
# Primero hacer dry-run para ver qué se migrará
npm run migrate:images:dry

# Si todo se ve bien, migrar
npm run migrate:images

# O solo productos
npm run migrate:images:products

# O solo eventos
npm run migrate:images:events
```

## Troubleshooting

### "CDN configuration is incomplete"
Verifica que todas las variables de entorno estén configuradas en `.env`.

### "Access Denied"
Verifica que las credenciales sean correctas y que el bucket tenga permisos públicos.

### "El archivo excede el tamaño máximo permitido"
El límite es 5MB por imagen. Comprime la imagen antes de subir.

### Imágenes no se muestran
1. Verifica que el bucket sea público
2. Verifica CORS en configuración del bucket
3. Verifica que la URL sea correcta

## Configuración de AWS S3 (Alternativa)

Si prefieres AWS S3:

1. Crea bucket en S3
2. Configura política pública:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::guelaguetza-connect-cdn/*"
  }]
}
```

3. Crea usuario IAM con permisos S3

4. Configura `.env`:
```env
CDN_PROVIDER=aws
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=us-east-1
CDN_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
CDN_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
CDN_PUBLIC_BUCKET=false
```

## Características

- ✅ Optimización automática de imágenes
- ✅ Generación de thumbnails
- ✅ Cache headers optimizados (1 año)
- ✅ Lazy loading nativo
- ✅ Placeholders mientras carga
- ✅ Error fallbacks
- ✅ Validación de tipo y tamaño
- ✅ Nombres únicos automáticos
- ✅ Soporte dark mode
- ✅ TypeScript completo

## Documentación Completa

- **Setup detallado**: `backend/CDN_SETUP_GUIDE.md`
- **Testing**: `backend/CDN_TESTING_GUIDE.md`
- **LazyImage**: `components/ui/LAZY_IMAGE_GUIDE.md`
- **Implementación**: `CDN_IMPLEMENTATION_SUMMARY.md`

## Ejemplo Completo de Upload + Display

```tsx
import { useState } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';

function ImageUploadExample() {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        '/api/upload/image?generateThumbnail=true',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const { data } = await response.json();
      setImageUrl(data.url);
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

      {uploading && <p>Subiendo...</p>}

      {imageUrl && (
        <LazyImage
          src={imageUrl}
          alt="Imagen subida"
          className="mt-4 w-full max-w-md rounded-lg shadow-lg"
        />
      )}
    </div>
  );
}
```

## Próximos Pasos

1. Configurar CDN (Cloudflare R2 o AWS S3)
2. Agregar variables de entorno
3. Probar upload de imagen
4. Integrar LazyImage en componentes
5. Migrar imágenes existentes
6. (Opcional) Configurar custom domain

¡Listo! El CDN está configurado y funcionando.
