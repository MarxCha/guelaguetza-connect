import { describe, it, expect } from 'vitest';
import { getTestApp, getTestPrisma } from './setup.js';

/**
 * E2E Test: Verificación de configuración
 *
 * Tests básicos para verificar que la configuración de E2E funciona:
 * - App de Fastify se levanta correctamente
 * - Base de datos se conecta
 * - Rutas básicas responden
 */
describe('E2E: Health & Configuration', () => {
  const app = getTestApp();
  const prisma = getTestPrisma();

  it('App de Fastify está funcionando', async () => {
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
  });

  it('Ruta /health responde correctamente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
  });

  it('Ruta raíz responde con info de API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('endpoints');
  });

  it('Base de datos está conectada', async () => {
    // Intentar query simple
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('Rutas 404 devuelven error apropiado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/ruta-que-no-existe',
    });

    expect(response.statusCode).toBe(404);
  });

  it('Rutas protegidas requieren autenticación', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('JWT puede generarse y validarse', async () => {
    const payload = { userId: 'test-user-123' };
    const token = app.jwt.sign(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = app.jwt.decode(token);
    expect(decoded).toHaveProperty('userId', 'test-user-123');
  });

  it('Prisma puede crear y leer datos', async () => {
    // Crear usuario de prueba
    const user = await prisma.user.create({
      data: {
        email: 'health-test@example.com',
        password: 'hashedpassword',
        nombre: 'Test',
        apellido: 'Health',
      },
    });

    expect(user).toBeDefined();
    expect(user).toHaveProperty('id');
    expect(user.email).toBe('health-test@example.com');

    // Leer usuario
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('health-test@example.com');

    // Limpiar
    await prisma.user.delete({
      where: { id: user.id },
    });
  });

  it('Cleanup entre tests funciona correctamente', async () => {
    // Este test verifica que beforeEach limpia los datos
    const userCount = await prisma.user.count();

    // Después del cleanup del test anterior, no debería haber usuarios
    expect(userCount).toBe(0);
  });
});
