import { buildApp } from '../src/app.js';
/**
 * Crea una instancia de la app de Fastify para tests
 * @returns Instancia de Fastify lista para testing
 */
export async function createTestApp() {
    const app = await buildApp();
    await app.ready();
    return app;
}
/**
 * Cierra la app de Fastify después de los tests
 * @param app Instancia de Fastify a cerrar
 */
export async function closeTestApp(app) {
    await app.close();
}
/**
 * Mock de usuario para tests
 */
export const mockUser = {
    id: '1',
    email: 'test@example.com',
    nombre: 'Test',
    apellido: 'User',
    password: '$2a$10$hashedpassword',
    avatar: null,
    region: 'Valles Centrales',
    role: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};
/**
 * Mock de token JWT para tests
 */
export function generateTestToken(app, payload = { id: '1', email: 'test@example.com' }) {
    return app.jwt.sign(payload);
}
//# sourceMappingURL=helpers.js.map