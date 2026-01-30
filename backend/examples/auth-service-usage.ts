/**
 * Ejemplos de uso del AuthService
 *
 * Este archivo muestra cómo usar todas las funcionalidades del AuthService
 * en diferentes escenarios.
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/services/auth.service.js';

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

// ============================================
// EJEMPLO 1: REGISTRO DE USUARIO
// ============================================

async function ejemploRegistro() {
  console.log('\n=== EJEMPLO 1: Registro de Usuario ===');

  try {
    const resultado = await authService.register({
      email: 'nuevo@example.com',
      password: 'password123',
      nombre: 'Usuario',
      apellido: 'Nuevo',
      region: 'Valles Centrales',
    });

    console.log('Usuario registrado:', resultado.user);
    console.log('Access Token:', resultado.tokens.accessToken.substring(0, 50) + '...');
    console.log('Refresh Token:', resultado.tokens.refreshToken.substring(0, 50) + '...');
    console.log('Expira en:', resultado.tokens.expiresIn, 'segundos');

    return resultado;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error en registro:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 2: LOGIN
// ============================================

async function ejemploLogin() {
  console.log('\n=== EJEMPLO 2: Login ===');

  try {
    const resultado = await authService.login(
      'nuevo@example.com',
      'password123'
    );

    console.log('Login exitoso:', resultado.user.email);
    console.log('Tokens generados:', {
      accessToken: resultado.tokens.accessToken.substring(0, 50) + '...',
      refreshToken: resultado.tokens.refreshToken.substring(0, 50) + '...',
    });

    return resultado;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error en login:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 3: VERIFICACIÓN DE ACCESS TOKEN
// ============================================

async function ejemploVerificarAccessToken(accessToken: string) {
  console.log('\n=== EJEMPLO 3: Verificar Access Token ===');

  try {
    const payload = await authService.verifyAccessToken(accessToken);

    console.log('Token válido. Payload:');
    console.log('- User ID:', payload.sub);
    console.log('- Email:', payload.email);
    console.log('- Role:', payload.role);
    console.log('- Token Type:', payload.type);
    console.log('- JWT ID:', payload.jti);
    console.log('- Issued At:', new Date(payload.iat * 1000).toISOString());
    console.log('- Expires At:', new Date(payload.exp * 1000).toISOString());

    return payload;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error verificando token:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 4: REFRESH TOKENS
// ============================================

async function ejemploRefreshTokens(refreshToken: string) {
  console.log('\n=== EJEMPLO 4: Refresh Tokens ===');

  try {
    const nuevosTokens = await authService.refreshTokens(refreshToken);

    console.log('Tokens refrescados exitosamente:');
    console.log('- Nuevo Access Token:', nuevosTokens.accessToken.substring(0, 50) + '...');
    console.log('- Nuevo Refresh Token:', nuevosTokens.refreshToken.substring(0, 50) + '...');
    console.log('- Expira en:', nuevosTokens.expiresIn, 'segundos');

    return nuevosTokens;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error refrescando tokens:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 5: HASH Y VERIFICACIÓN DE PASSWORD
// ============================================

async function ejemploPasswordHashing() {
  console.log('\n=== EJEMPLO 5: Hash y Verificación de Password ===');

  const password = 'mySecurePassword123';

  // Hash
  const hash = await authService.hashPassword(password);
  console.log('Password original:', password);
  console.log('Password hasheado:', hash);

  // Verificar correcto
  const esValido = await authService.verifyPassword(password, hash);
  console.log('Verificación con password correcto:', esValido);

  // Verificar incorrecto
  const esInvalido = await authService.verifyPassword('wrongPassword', hash);
  console.log('Verificación con password incorrecto:', esInvalido);
}

// ============================================
// EJEMPLO 6: OBTENER PERFIL
// ============================================

async function ejemploObtenerPerfil(userId: string) {
  console.log('\n=== EJEMPLO 6: Obtener Perfil ===');

  try {
    const perfil = await authService.getProfile(userId);

    console.log('Perfil del usuario:');
    console.log('- ID:', perfil.id);
    console.log('- Email:', perfil.email);
    console.log('- Nombre:', perfil.nombre);
    console.log('- Apellido:', perfil.apellido);
    console.log('- Región:', perfil.region);
    console.log('- Role:', perfil.role);
    console.log('- Stories:', perfil._count.stories);
    console.log('- Likes:', perfil._count.likes);

    return perfil;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error obteniendo perfil:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 7: ACTUALIZAR PERFIL
// ============================================

async function ejemploActualizarPerfil(userId: string) {
  console.log('\n=== EJEMPLO 7: Actualizar Perfil ===');

  try {
    const perfilActualizado = await authService.updateProfile(userId, {
      nombre: 'Nombre Actualizado',
      apellido: 'Apellido Actualizado',
      region: 'Istmo',
    });

    console.log('Perfil actualizado:');
    console.log('- Nombre:', perfilActualizado.nombre);
    console.log('- Apellido:', perfilActualizado.apellido);
    console.log('- Región:', perfilActualizado.region);

    return perfilActualizado;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error actualizando perfil:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 8: CAMBIAR CONTRASEÑA
// ============================================

async function ejemploCambiarPassword(userId: string) {
  console.log('\n=== EJEMPLO 8: Cambiar Contraseña ===');

  try {
    const resultado = await authService.changePassword(
      userId,
      'password123',       // Contraseña actual
      'newPassword456'     // Nueva contraseña
    );

    console.log(resultado.message);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error cambiando contraseña:', error.message);
    }
  }
}

// ============================================
// EJEMPLO 9: GENERAR PAR DE TOKENS MANUALMENTE
// ============================================

async function ejemploGenerarTokens(userId: string, email: string, role: string) {
  console.log('\n=== EJEMPLO 9: Generar Tokens Manualmente ===');

  const tokens = await authService.generateTokenPair(userId, email, role);

  console.log('Tokens generados:');
  console.log('- Access Token:', tokens.accessToken.substring(0, 50) + '...');
  console.log('- Refresh Token:', tokens.refreshToken.substring(0, 50) + '...');
  console.log('- Expira en:', tokens.expiresIn, 'segundos');

  return tokens;
}

// ============================================
// EJEMPLO 10: REVOCAR TODOS LOS TOKENS
// ============================================

async function ejemploRevocarTokens(userId: string) {
  console.log('\n=== EJEMPLO 10: Revocar Todos los Tokens ===');

  try {
    const resultado = await authService.revokeAllTokens(userId);
    console.log(resultado.message);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error revocando tokens:', error.message);
    }
  }
}

// ============================================
// FLUJO COMPLETO DE AUTENTICACIÓN
// ============================================

async function flujoCompletoAutenticacion() {
  console.log('\n\n========================================');
  console.log('FLUJO COMPLETO DE AUTENTICACIÓN');
  console.log('========================================');

  // 1. Registro
  const registro = await ejemploRegistro();
  if (!registro) return;

  // 2. Verificar access token
  await ejemploVerificarAccessToken(registro.tokens.accessToken);

  // 3. Obtener perfil
  await ejemploObtenerPerfil(registro.user.id);

  // 4. Actualizar perfil
  await ejemploActualizarPerfil(registro.user.id);

  // 5. Cambiar contraseña
  await ejemploCambiarPassword(registro.user.id);

  // 6. Login con nueva contraseña
  const login = await authService.login('nuevo@example.com', 'newPassword456');
  if (!login) return;

  console.log('\n✓ Login con nueva contraseña exitoso');

  // 7. Refresh tokens
  await ejemploRefreshTokens(login.tokens.refreshToken);

  // 8. Revocar tokens
  await ejemploRevocarTokens(registro.user.id);

  // 9. Limpiar (eliminar usuario de prueba)
  await prisma.user.delete({ where: { email: 'nuevo@example.com' } });
  console.log('\n✓ Usuario de prueba eliminado');
}

// ============================================
// EJEMPLO DE MANEJO DE ERRORES
// ============================================

async function ejemploManejoErrores() {
  console.log('\n\n========================================');
  console.log('MANEJO DE ERRORES');
  console.log('========================================');

  // Error 1: Email duplicado
  console.log('\n--- Error: Email duplicado ---');
  try {
    await authService.register({
      email: 'test@example.com',
      password: 'password123',
      nombre: 'Test',
    });
    await authService.register({
      email: 'test@example.com', // Mismo email
      password: 'password123',
      nombre: 'Test2',
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log('✓ Error capturado:', error.message);
    }
  }

  // Error 2: Credenciales inválidas
  console.log('\n--- Error: Credenciales inválidas ---');
  try {
    await authService.login('test@example.com', 'wrongPassword');
  } catch (error) {
    if (error instanceof Error) {
      console.log('✓ Error capturado:', error.message);
    }
  }

  // Error 3: Token expirado/inválido
  console.log('\n--- Error: Token inválido ---');
  try {
    await authService.verifyAccessToken('invalid.token.here');
  } catch (error) {
    if (error instanceof Error) {
      console.log('✓ Error capturado:', error.message);
    }
  }

  // Error 4: Contraseña muy corta
  console.log('\n--- Error: Contraseña muy corta ---');
  try {
    await authService.hashPassword('123'); // Menos de 6 caracteres
  } catch (error) {
    if (error instanceof Error) {
      console.log('✓ Error capturado:', error.message);
    }
  }

  // Limpiar
  await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
}

// ============================================
// EJECUTAR EJEMPLOS
// ============================================

async function main() {
  try {
    // Ejemplos individuales
    await ejemploPasswordHashing();

    // Flujo completo
    await flujoCompletoAutenticacion();

    // Manejo de errores
    await ejemploManejoErrores();

    console.log('\n\n========================================');
    console.log('✓ TODOS LOS EJEMPLOS EJECUTADOS');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error en ejemplos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Descomentar para ejecutar:
// main();

// ============================================
// EXPORTS (para usar en otros archivos)
// ============================================

export {
  ejemploRegistro,
  ejemploLogin,
  ejemploVerificarAccessToken,
  ejemploRefreshTokens,
  ejemploPasswordHashing,
  ejemploObtenerPerfil,
  ejemploActualizarPerfil,
  ejemploCambiarPassword,
  ejemploGenerarTokens,
  ejemploRevocarTokens,
  flujoCompletoAutenticacion,
  ejemploManejoErrores,
};
