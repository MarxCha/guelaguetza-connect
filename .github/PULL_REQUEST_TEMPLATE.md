## Descripción

<!-- Describe claramente qué cambios introduce este PR y por qué son necesarios -->

## Tipo de cambio

<!-- Marca con una 'x' el tipo de cambio que aplica -->

- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione como antes)
- [ ] Refactoring (mejoras de código sin cambiar funcionalidad)
- [ ] Actualización de documentación
- [ ] Cambios de configuración/infrastructure
- [ ] Tests

## Issue relacionado

<!-- Si existe un issue relacionado, referéncialo aquí -->

Fixes #(issue)

## Checklist

### Código

- [ ] El código sigue las convenciones del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado mi código en áreas difíciles de entender
- [ ] No hay warnings en la consola
- [ ] El código compila sin errores (`npm run build`)

### Tests

- [ ] He agregado tests que prueban mi fix/feature
- [ ] Todos los tests pasan localmente (`npm run test`)
- [ ] Los tests de integración pasan (`npm run test:integration`)
- [ ] He verificado el coverage de mis cambios

### Documentación

- [ ] He actualizado la documentación relevante
- [ ] He actualizado los comentarios en el código si es necesario
- [ ] He actualizado el README si agrego nuevas features

### Base de Datos (si aplica)

- [ ] He creado las migraciones necesarias
- [ ] Las migraciones son reversibles
- [ ] He actualizado el seed si es necesario
- [ ] He probado las migraciones en desarrollo

### Performance (si aplica)

- [ ] He considerado el impacto en performance
- [ ] He agregado índices necesarios en la BD
- [ ] He implementado cache donde es apropiado
- [ ] No hay N+1 queries

### Seguridad (si aplica)

- [ ] He validado todos los inputs
- [ ] He sanitizado datos del usuario
- [ ] He verificado permisos y autorización
- [ ] No expongo información sensible

## Cambios en la API

<!-- Si este PR introduce cambios en la API, descríbelos aquí -->

### Breaking Changes

<!-- Lista cualquier breaking change -->

- [ ] No hay breaking changes
- [ ] He listado los breaking changes en la descripción

### Nuevos Endpoints

<!-- Lista nuevos endpoints si los hay -->

```
GET/POST/PUT/DELETE /api/...
```

## Screenshots (si aplica)

<!-- Agrega screenshots de cambios visuales -->

### Antes

<!-- Screenshot del estado anterior -->

### Después

<!-- Screenshot del nuevo estado -->

## Testing Realizado

<!-- Describe qué tests has ejecutado para verificar tus cambios -->

- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Testing manual

### Detalles de Testing Manual

<!-- Describe los pasos para probar manualmente -->

1. 
2. 
3. 

## Deployment Notes

<!-- Notas importantes para el deployment -->

- [ ] No requiere configuración adicional
- [ ] Requiere nuevas variables de entorno (listar abajo)
- [ ] Requiere ejecutar migraciones
- [ ] Requiere ejecutar seeds
- [ ] Requiere actualizar dependencias externas

### Variables de Entorno Nuevas

```env
NEW_VAR=value
```

## Checklist de Reviewers

<!-- Para uso de los revisores -->

- [ ] El código es claro y mantenible
- [ ] Los tests son suficientes
- [ ] La documentación está actualizada
- [ ] No hay problemas de seguridad
- [ ] No hay problemas de performance
- [ ] Los cambios son coherentes con la arquitectura

## Notas Adicionales

<!-- Cualquier contexto adicional sobre el PR -->

---

**Por favor asegúrate de que tu PR cumple con todos los requisitos antes de solicitar review.**
