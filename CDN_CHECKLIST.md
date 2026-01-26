# CDN Implementation Checklist

Lista de verificación para implementar y probar el sistema CDN.

## ✅ Fase 1: Setup Inicial (15-30 min)

### Configurar Proveedor CDN

#### Opción A: Cloudflare R2 (Recomendado)
- [ ] Crear cuenta en Cloudflare (si no tienes)
- [ ] Ir a R2 Object Storage
- [ ] Crear bucket `guelaguetza-connect-cdn`
- [ ] Habilitar "Public Access"
- [ ] Generar API Token con permisos:
  - [ ] Object Read
  - [ ] Object Write
  - [ ] Object Delete
- [ ] Guardar Access Key ID
- [ ] Guardar Secret Access Key
- [ ] Guardar Account ID

#### Opción B: AWS S3
- [ ] Crear bucket en S3
- [ ] Configurar política de bucket pública
- [ ] Configurar CORS
- [ ] Crear usuario IAM con permisos S3
- [ ] Guardar Access Key ID
- [ ] Guardar Secret Access Key

### Configurar Variables de Entorno

- [ ] Copiar `backend/.env.example` a `backend/.env`
- [ ] Agregar variables CDN:
  - [ ] `CDN_PROVIDER`
  - [ ] `CDN_BUCKET`
  - [ ] `CDN_REGION`
  - [ ] `CDN_ACCESS_KEY_ID`
  - [ ] `CDN_SECRET_ACCESS_KEY`
  - [ ] `CLOUDFLARE_ACCOUNT_ID` (solo R2)
  - [ ] `CDN_PUBLIC_BUCKET`

## ✅ Fase 2: Testing Backend (10-15 min)

### Verificar Configuración

- [ ] Iniciar servidor: `npm run dev`
- [ ] Verificar que no hay errores de inicio
- [ ] Probar endpoint config:
  ```bash
  curl http://localhost:3001/api/upload/config \
    -H "Authorization: Bearer TOKEN"
  ```
- [ ] Verificar que retorna configuración correcta

### Probar Upload Simple

- [ ] Preparar imagen de prueba (< 5MB)
- [ ] Subir imagen:
  ```bash
  curl -X POST http://localhost:3001/api/upload/image \
    -H "Authorization: Bearer TOKEN" \
    -F "file=@test.jpg"
  ```
- [ ] Verificar respuesta con URL
- [ ] Abrir URL en navegador
- [ ] Verificar que imagen se muestra

### Probar Upload con Thumbnail

- [ ] Subir imagen con thumbnail:
  ```bash
  curl -X POST "http://localhost:3001/api/upload/image?generateThumbnail=true" \
    -H "Authorization: Bearer TOKEN" \
    -F "file=@test.jpg"
  ```
- [ ] Verificar que retorna `thumbnailUrl`
- [ ] Abrir thumbnail URL
- [ ] Verificar que thumbnail es más pequeño

### Probar Delete

- [ ] Copiar `key` de imagen subida
- [ ] URL encode la key
- [ ] Eliminar imagen:
  ```bash
  curl -X DELETE "http://localhost:3001/api/upload/ENCODED_KEY" \
    -H "Authorization: Bearer TOKEN"
  ```
- [ ] Verificar respuesta success
- [ ] Intentar abrir URL de imagen
- [ ] Verificar que da error 404

### Probar Validaciones

- [ ] Intentar subir archivo > 5MB (debe fallar)
- [ ] Intentar subir PDF (debe fallar)
- [ ] Intentar subir sin autenticación (debe fallar)
- [ ] Verificar mensajes de error

## ✅ Fase 3: Testing Frontend (10 min)

### Componente LazyImage

- [ ] Crear página de prueba
- [ ] Importar LazyImage:
  ```tsx
  import { LazyImage } from '@/components/ui/LazyImage';
  ```
- [ ] Renderizar con URL del CDN
- [ ] Verificar que imagen carga
- [ ] Verificar placeholder mientras carga
- [ ] Scroll para verificar lazy loading

### Variantes de LazyImage

- [ ] Probar LazyAvatar:
  ```tsx
  <LazyAvatar src={url} alt="User" size="md" />
  ```
- [ ] Probar LazyProductImage:
  ```tsx
  <LazyProductImage src={url} alt="Product" aspectRatio="4/3" />
  ```
- [ ] Probar LazyHeroImage:
  ```tsx
  <LazyHeroImage src={url} alt="Hero" overlay={true} />
  ```

### Upload desde Frontend

- [ ] Crear componente de upload
- [ ] Implementar función handleUpload
- [ ] Probar upload desde UI
- [ ] Verificar que muestra imagen después de subir
- [ ] Verificar loading state

## ✅ Fase 4: Migración de Imágenes (20-30 min)

### Preparación

- [ ] Verificar imágenes en `/public/images`
- [ ] Hacer backup de imágenes locales
- [ ] Hacer backup de base de datos

### Dry Run

- [ ] Ejecutar: `npm run migrate:images:dry`
- [ ] Revisar output
- [ ] Verificar que encuentra todas las imágenes
- [ ] Verificar que no hay errores

### Migración Real

- [ ] Ejecutar: `npm run migrate:images:products`
- [ ] Verificar progress en consola
- [ ] Verificar que no hay errores
- [ ] Ejecutar: `npm run migrate:images:events`
- [ ] Verificar progress
- [ ] Verificar resumen final

### Verificación

- [ ] Abrir base de datos
- [ ] Verificar que URLs apuntan al CDN
- [ ] Abrir algunas URLs en navegador
- [ ] Verificar que imágenes se muestran
- [ ] Probar frontend con imágenes migradas

## ✅ Fase 5: Integración en Producción (Variable)

### Preparación

- [ ] Revisar todas las pruebas
- [ ] Documentar problemas encontrados
- [ ] Resolver issues críticos

### Integración

- [ ] Actualizar componentes existentes para usar LazyImage
- [ ] Buscar usos de `<img>` directo:
  ```bash
  grep -r "<img" components/
  ```
- [ ] Reemplazar con LazyImage
- [ ] Probar cambios

### Limpieza (Opcional)

- [ ] Verificar que imágenes se sirven desde CDN
- [ ] Eliminar imágenes de `/public/images` (con cuidado)
- [ ] Verificar que todo funciona sin imágenes locales

## ✅ Fase 6: Optimización (Opcional)

### Custom Domain

- [ ] Configurar custom domain en Cloudflare
- [ ] Actualizar `CDN_URL` en .env
- [ ] Probar URLs con custom domain

### CloudFront/CDN

- [ ] Configurar CloudFront (AWS) o CDN (Cloudflare)
- [ ] Configurar cache policies
- [ ] Actualizar `CDN_URL`
- [ ] Probar performance

### Monitoreo

- [ ] Configurar alertas de costos
- [ ] Configurar métricas de uso
- [ ] Revisar logs de upload
- [ ] Monitorear errores

## 📊 Verificación Final

### Funcionalidades Core

- [ ] Upload funciona
- [ ] Delete funciona
- [ ] Thumbnails se generan
- [ ] LazyImage carga imágenes
- [ ] Migración completada

### Performance

- [ ] Imágenes se cargan rápido
- [ ] Lazy loading funciona
- [ ] Cache headers correctos
- [ ] Placeholders se muestran

### Seguridad

- [ ] Autenticación funciona
- [ ] Validaciones funcionan
- [ ] Límites de tamaño respetados
- [ ] CORS configurado

### UX

- [ ] Loading states
- [ ] Error handling
- [ ] Placeholders
- [ ] Blur effects

## 🐛 Troubleshooting

Si algo falla:

1. [ ] Revisar logs del servidor
2. [ ] Verificar variables de entorno
3. [ ] Verificar credenciales del CDN
4. [ ] Consultar `backend/CDN_TESTING_GUIDE.md`
5. [ ] Verificar CORS en bucket
6. [ ] Verificar permisos de bucket

## 📝 Documentación de Referencia

- Quick Start: `CDN_QUICKSTART.md`
- Setup Completo: `backend/CDN_SETUP_GUIDE.md`
- Testing: `backend/CDN_TESTING_GUIDE.md`
- LazyImage: `components/ui/LAZY_IMAGE_GUIDE.md`
- Resumen: `CDN_IMPLEMENTATION_SUMMARY.md`

## ✅ Checklist de Producción

Antes de ir a producción:

- [ ] Todas las pruebas pasaron
- [ ] Migración completada
- [ ] Documentación actualizada
- [ ] Variables de producción configuradas
- [ ] Backup de imágenes locales
- [ ] Monitoreo configurado
- [ ] Costos estimados
- [ ] Plan de rollback definido

## 🎉 Completado

Una vez que todos los checkboxes estén marcados:

- [ ] CDN está funcionando
- [ ] Imágenes migradas
- [ ] Frontend actualizado
- [ ] Documentación completa
- [ ] Sistema en producción

---

**Tiempo estimado total**: 2-3 horas
**Complejidad**: Media
**Prerequisitos**: Conocimientos básicos de cloud storage, React, TypeScript
