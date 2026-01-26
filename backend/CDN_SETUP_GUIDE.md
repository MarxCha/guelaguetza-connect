# Guía de Configuración de CDN

Esta guía te ayudará a configurar el sistema de CDN para almacenar imágenes estáticas en el proyecto Guelaguetza Connect.

## Tabla de Contenidos

- [Proveedores Soportados](#proveedores-soportados)
- [Configuración de AWS S3](#configuración-de-aws-s3)
- [Configuración de Cloudflare R2](#configuración-de-cloudflare-r2)
- [Variables de Entorno](#variables-de-entorno)
- [Uso del Servicio](#uso-del-servicio)
- [Endpoints API](#endpoints-api)
- [Optimización de Imágenes](#optimización-de-imágenes)
- [Migración de Imágenes Existentes](#migración-de-imágenes-existentes)

## Proveedores Soportados

El sistema soporta dos proveedores de CDN:

1. **AWS S3 + CloudFront** - Ideal para proyectos enterprise con alta disponibilidad
2. **Cloudflare R2** - Ideal para proyectos que buscan reducir costos (sin egress fees)

## Configuración de AWS S3

### 1. Crear un Bucket S3

```bash
aws s3 mb s3://guelaguetza-connect-cdn --region us-east-1
```

### 2. Configurar Política de Bucket (Público)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::guelaguetza-connect-cdn/*"
    }
  ]
}
```

Aplicar política:

```bash
aws s3api put-bucket-policy --bucket guelaguetza-connect-cdn --policy file://bucket-policy.json
```

### 3. Configurar CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://guelaguetzaconnect.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Aplicar CORS:

```bash
aws s3api put-bucket-cors --bucket guelaguetza-connect-cdn --cors-configuration file://cors-config.json
```

### 4. Crear Usuario IAM con Permisos

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::guelaguetza-connect-cdn",
        "arn:aws:s3:::guelaguetza-connect-cdn/*"
      ]
    }
  ]
}
```

Crear usuario y obtener Access Key ID y Secret Access Key:

```bash
aws iam create-user --user-name guelaguetza-cdn-user
aws iam put-user-policy --user-name guelaguetza-cdn-user --policy-name S3CDNAccess --policy-document file://iam-policy.json
aws iam create-access-key --user-name guelaguetza-cdn-user
```

### 5. (Opcional) Configurar CloudFront

```bash
aws cloudfront create-distribution --origin-domain-name guelaguetza-connect-cdn.s3.amazonaws.com
```

## Configuración de Cloudflare R2

### 1. Crear Bucket R2

1. Ir a Cloudflare Dashboard > R2 Object Storage
2. Crear nuevo bucket: `guelaguetza-connect-cdn`
3. Configurar como **Public Bucket** (opcional)

### 2. Configurar Dominio Público (Opcional)

1. En configuración del bucket, habilitar "Public Access"
2. Obtener URL pública: `https://pub-<bucket-id>.r2.dev`
3. O configurar custom domain: `cdn.guelaguetzaconnect.com`

### 3. Generar API Tokens

1. Ir a R2 > Manage R2 API Tokens
2. Crear token con permisos:
   - Object Read
   - Object Write
   - Object Delete
3. Obtener:
   - Access Key ID
   - Secret Access Key
   - Account ID

### 4. Configurar CORS

En el dashboard de R2, agregar regla CORS:

```json
[
  {
    "AllowedOrigins": ["https://guelaguetzaconnect.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Variables de Entorno

Agregar al archivo `.env`:

### Para AWS S3:

```env
# CDN Configuration - AWS S3
CDN_PROVIDER=aws
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=us-east-1
CDN_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
CDN_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# (Opcional) URL de CloudFront
CDN_URL=https://d1234567890.cloudfront.net

# Bucket público (default: false)
CDN_PUBLIC_BUCKET=false
```

### Para Cloudflare R2:

```env
# CDN Configuration - Cloudflare R2
CDN_PROVIDER=cloudflare
CDN_BUCKET=guelaguetza-connect-cdn
CDN_REGION=auto
CDN_ACCESS_KEY_ID=your-r2-access-key-id
CDN_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_ACCOUNT_ID=your-account-id

# (Opcional) URL personalizada
CDN_URL=https://cdn.guelaguetzaconnect.com

# Bucket público (default: false)
CDN_PUBLIC_BUCKET=true
```

## Uso del Servicio

### Desde el Backend (TypeScript)

```typescript
import { uploadService } from './services/upload.service.js';

// Upload simple
const buffer = await file.toBuffer();
const result = await uploadService.uploadImage(
  buffer,
  'my-image.jpg',
  'image/jpeg'
);

console.log(result.url); // URL pública de la imagen

// Upload con thumbnail
const resultWithThumb = await uploadService.uploadImage(
  buffer,
  'my-image.jpg',
  'image/jpeg',
  {
    generateThumbnail: true,
    thumbnailWidth: 300,
    thumbnailHeight: 300,
  }
);

console.log(resultWithThumb.url); // URL original
console.log(resultWithThumb.thumbnailUrl); // URL del thumbnail

// Eliminar imagen
await uploadService.deleteImage(result.key);
```

## Endpoints API

### POST `/api/upload/image`

Sube una imagen al CDN.

**Autenticación:** Requerida

**Body:** `multipart/form-data`

**Query Parameters:**
- `generateThumbnail` (boolean, optional): Generar thumbnail
- `thumbnailWidth` (number, optional): Ancho del thumbnail (default: 300)
- `thumbnailHeight` (number, optional): Alto del thumbnail (default: 300)

**Ejemplo con cURL:**

```bash
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "generateThumbnail=true" \
  -F "thumbnailWidth=300" \
  -F "thumbnailHeight=300"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.guelaguetzaconnect.com/images/1234567890-abc123.jpg",
    "key": "images/1234567890-abc123.jpg",
    "thumbnailUrl": "https://cdn.guelaguetzaconnect.com/images/thumbnails/1234567890-thumb-abc123.jpg",
    "thumbnailKey": "images/thumbnails/1234567890-thumb-abc123.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

### DELETE `/api/upload/:key`

Elimina una imagen del CDN.

**Autenticación:** Requerida

**Parámetros:**
- `key` (string): La clave de la imagen a eliminar (URL encoded)

**Ejemplo:**

```bash
curl -X DELETE "http://localhost:3001/api/upload/images%2F1234567890-abc123.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Imagen eliminada correctamente"
}
```

### GET `/api/upload/config`

Obtiene la configuración del CDN.

**Autenticación:** Requerida

**Ejemplo:**

```bash
curl http://localhost:3001/api/upload/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "provider": "cloudflare",
    "bucket": "guelaguetza-connect-cdn",
    "region": "auto",
    "cdnUrl": "https://cdn.guelaguetzaconnect.com",
    "publicBucket": true
  }
}
```

## Optimización de Imágenes

El servicio automáticamente optimiza las imágenes:

### Optimizaciones Automáticas:

1. **JPEG**: Compresión progresiva con calidad 85%
2. **PNG**: Compresión nivel 9
3. **WebP**: Calidad 85%
4. **Thumbnails**: JPEG calidad 80%, resize con cover fit

### Headers de Cache:

Todas las imágenes se suben con:

```
Cache-Control: public, max-age=31536000, immutable
```

Esto significa:
- Cache público (puede ser cacheado por CDN)
- TTL de 1 año
- Inmutable (no cambiará)

### Tamaños Recomendados:

- **Imágenes de perfil**: 300x300px
- **Imágenes de productos**: 800x600px
- **Banners**: 1920x1080px
- **Thumbnails**: 300x300px

## Migración de Imágenes Existentes

Si tienes imágenes existentes en `/public/images`, puedes migrarlas usando el script:

```bash
npm run migrate:images
```

Este script:

1. Lee todas las imágenes de `/public/images`
2. Las sube al CDN
3. Actualiza las referencias en la base de datos
4. Genera thumbnails automáticamente

### Script de Migración:

```typescript
// scripts/migrate-images.ts
import fs from 'fs';
import path from 'path';
import { uploadService } from '../src/services/upload.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImages() {
  const publicDir = path.join(__dirname, '../../public/images');
  const files = fs.readdirSync(publicDir);

  for (const file of files) {
    const filePath = path.join(publicDir, file);
    const buffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(file);

    const result = await uploadService.uploadImage(
      buffer,
      file,
      mimeType,
      { generateThumbnail: true }
    );

    // Actualizar referencias en BD
    await prisma.product.updateMany({
      where: { imageUrl: `/images/${file}` },
      data: { imageUrl: result.url },
    });

    console.log(`Migrated: ${file} -> ${result.url}`);
  }
}

migrateImages();
```

## Cache Headers Recomendados

### CloudFront (AWS):

```json
{
  "DefaultCacheBehavior": {
    "MinTTL": 31536000,
    "DefaultTTL": 31536000,
    "MaxTTL": 31536000,
    "Compress": true
  }
}
```

### Cloudflare:

1. Ir a Cache > Configuration
2. Configurar Browser Cache TTL: 1 year
3. Habilitar Auto Minify
4. Habilitar Brotli compression

## Troubleshooting

### Error: "CDN configuration is incomplete"

Verifica que todas las variables de entorno estén configuradas:
- `CDN_BUCKET`
- `CDN_ACCESS_KEY_ID`
- `CDN_SECRET_ACCESS_KEY`

### Error: "Access Denied"

1. Verifica que el usuario IAM tenga los permisos correctos
2. Verifica que la política del bucket permita `s3:GetObject`
3. Verifica que las credenciales sean correctas

### Imágenes no se muestran

1. Verifica que el bucket sea público o tenga la política correcta
2. Verifica que CORS esté configurado
3. Verifica que la URL del CDN sea correcta

## Seguridad

### Recomendaciones:

1. **Nunca** commiteés las credenciales al repositorio
2. Usa IAM users con permisos mínimos necesarios
3. Rota las credenciales regularmente
4. Usa buckets privados con signed URLs para contenido sensible
5. Implementa rate limiting en los endpoints de upload
6. Valida el tipo de archivo en el backend

### Signed URLs (para buckets privados):

```typescript
const signedUrl = await uploadService.getSignedUrl('images/private.jpg', 3600);
// URL válida por 1 hora
```

## Monitoreo

### Métricas a Monitorear:

1. **Tamaño del bucket**: Costos de almacenamiento
2. **Transferencia de datos**: Costos de egress (solo AWS)
3. **Número de requests**: Costos de API calls
4. **Tasa de error**: Fallos en uploads/deletes

### AWS CloudWatch:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=guelaguetza-connect-cdn \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average
```

## Costos Estimados

### AWS S3 + CloudFront:

- S3 Storage: $0.023/GB/mes
- S3 Requests: $0.005/1000 PUT, $0.0004/1000 GET
- CloudFront Transfer: $0.085/GB (primeros 10TB)

**Ejemplo**: 100GB storage, 1M requests/mes = ~$15/mes

### Cloudflare R2:

- Storage: $0.015/GB/mes
- Requests: $0 egress (sin cargo por transferencia)
- Class A ops (PUT): $4.50/million
- Class B ops (GET): $0.36/million

**Ejemplo**: 100GB storage, 1M requests/mes = ~$5/mes

## Conclusión

Con esta configuración, tendrás un sistema robusto de CDN para almacenar y servir imágenes estáticas de manera eficiente y escalable. El servicio maneja automáticamente la optimización, generación de thumbnails, y cache headers para máximo rendimiento.
