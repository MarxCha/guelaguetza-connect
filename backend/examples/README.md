# Ejemplos de Uso - Guelaguetza Connect Backend

Esta carpeta contiene ejemplos prácticos de uso de los servicios del backend.

## Archivos

### auth-service-usage.ts

Ejemplos completos de uso del AuthService:

1. Registro de usuario
2. Login
3. Verificación de access token
4. Refresh de tokens
5. Hash y verificación de passwords
6. Obtener perfil
7. Actualizar perfil
8. Cambiar contraseña
9. Generar tokens manualmente
10. Revocar tokens

**Ejecutar ejemplos:**

```bash
# Ejecutar todos los ejemplos
tsx examples/auth-service-usage.ts

# Ejecutar ejemplo específico (descomentar en el archivo)
tsx examples/auth-service-usage.ts
```

**Importar en otros archivos:**

```typescript
import {
  ejemploRegistro,
  ejemploLogin,
  flujoCompletoAutenticacion,
} from './examples/auth-service-usage.js';

await flujoCompletoAutenticacion();
```

## Requisitos

- Base de datos PostgreSQL corriendo
- Variables de entorno configuradas (`.env`)
- Dependencias instaladas (`npm install`)

## Notas

Los ejemplos están comentados por defecto para evitar ejecución accidental. Descomenta la llamada a `main()` al final del archivo para ejecutarlos.
