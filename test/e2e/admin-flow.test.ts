import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, getTestPrisma, generateAuthToken } from './setup.js';
import { testUsers, TEST_PASSWORD } from './fixtures/users.js';

/**
 * E2E Test: Flujo completo de administración de usuarios
 *
 * Admin Journey:
 * 1. Login como admin
 * 2. Navegar a panel de administración
 * 3. Buscar usuario
 * 4. Ver detalles de usuario
 * 5. Banear usuario con razón
 * 6. Verificar que usuario baneado no puede acceder
 */
describe('E2E: Admin Flow - Gestión de usuarios', () => {
  const app = getTestApp();
  const prisma = getTestPrisma();

  let adminId: string;
  let targetUserId: string;

  beforeEach(async () => {
    // Seed: Crear admin
    const admin = await prisma.user.create({
      data: testUsers.adminUser,
    });
    adminId = admin.id;

    // Seed: Crear usuario regular (objetivo)
    const targetUser = await prisma.user.create({
      data: testUsers.regularUser,
    });
    targetUserId = targetUser.id;

    // Seed: Crear algunos usuarios adicionales para búsqueda
    await prisma.user.create({
      data: testUsers.hostUser,
    });

    await prisma.user.create({
      data: testUsers.sellerUser,
    });
  });

  it('Admin puede completar el flujo de gestión de usuarios exitosamente', async () => {
    // PASO 1: Login como admin
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.adminUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(loginResponse.body);
    expect(loginBody).toHaveProperty('token');
    expect(loginBody.user).toHaveProperty('role', 'ADMIN');

    const token = loginBody.token;

    // PASO 2: Acceder al panel de administración (dashboard stats)
    const dashboardResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(dashboardResponse.statusCode).toBe(200);
    const dashboardBody = JSON.parse(dashboardResponse.body);
    expect(dashboardBody.success).toBe(true);
    expect(dashboardBody.data).toHaveProperty('totalUsers');
    expect(dashboardBody.data).toHaveProperty('totalStories');
    expect(dashboardBody.data).toHaveProperty('activeUsers');
    expect(dashboardBody.data.totalUsers).toBeGreaterThan(0);

    // PASO 3a: Listar todos los usuarios
    const usersListResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=20',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(usersListResponse.statusCode).toBe(200);
    const usersListBody = JSON.parse(usersListResponse.body);
    expect(usersListBody.success).toBe(true);
    expect(usersListBody.data.users).toBeInstanceOf(Array);
    expect(usersListBody.data.users.length).toBeGreaterThan(0);
    expect(usersListBody.data).toHaveProperty('pagination');
    expect(usersListBody.data.pagination).toHaveProperty('total');

    // PASO 3b: Buscar usuario específico por email
    const searchResponse = await app.inject({
      method: 'GET',
      url: `/api/admin/users?search=${testUsers.regularUser.email}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(searchResponse.statusCode).toBe(200);
    const searchBody = JSON.parse(searchResponse.body);
    expect(searchBody.data.users).toBeInstanceOf(Array);
    expect(searchBody.data.users.length).toBe(1);
    expect(searchBody.data.users[0].email).toBe(testUsers.regularUser.email);

    // PASO 3c: Buscar usuario por nombre
    const searchNameResponse = await app.inject({
      method: 'GET',
      url: `/api/admin/users?search=Juan`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(searchNameResponse.statusCode).toBe(200);
    const searchNameBody = JSON.parse(searchNameResponse.body);
    expect(searchNameBody.data.users.length).toBeGreaterThan(0);

    // PASO 4: Ver detalles de usuario encontrado
    const foundUser = searchBody.data.users[0];
    expect(foundUser).toHaveProperty('id');
    expect(foundUser).toHaveProperty('email');
    expect(foundUser).toHaveProperty('nombre');
    expect(foundUser).toHaveProperty('role');
    expect(foundUser).toHaveProperty('bannedAt');
    expect(foundUser.bannedAt).toBeNull();

    // PASO 5: Banear usuario con razón
    const banResponse = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${targetUserId}/ban`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        reason: 'Violación de términos de servicio - spam',
      },
    });

    expect(banResponse.statusCode).toBe(200);
    const banBody = JSON.parse(banResponse.body);
    expect(banBody.success).toBe(true);
    expect(banBody.message).toContain('baneado');

    // PASO 6: Verificar que usuario fue baneado en la BD
    const bannedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    expect(bannedUser).toBeDefined();
    expect(bannedUser?.bannedAt).not.toBeNull();
    expect(bannedUser?.bannedReason).toBe('Violación de términos de servicio - spam');

    // PASO 7: Verificar que usuario baneado no puede hacer login
    const bannedLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.regularUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(bannedLoginResponse.statusCode).toBe(403);
    const bannedLoginBody = JSON.parse(bannedLoginResponse.body);
    expect(bannedLoginBody.error).toContain('baneado');

    // PASO 8: Filtrar usuarios baneados
    const bannedUsersResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users?banned=true',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(bannedUsersResponse.statusCode).toBe(200);
    const bannedUsersBody = JSON.parse(bannedUsersResponse.body);
    expect(bannedUsersBody.data.users).toBeInstanceOf(Array);
    expect(bannedUsersBody.data.users.every((u: any) => u.bannedAt !== null)).toBe(true);
  });

  it('Admin puede desbanear usuario', async () => {
    // Crear usuario baneado
    const bannedUser = await prisma.user.create({
      data: testUsers.bannedUser,
    });

    const token = generateAuthToken(adminId);

    // Desbanear usuario
    const unbanResponse = await app.inject({
      method: 'DELETE',
      url: `/api/admin/users/${bannedUser.id}/ban`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(unbanResponse.statusCode).toBe(200);
    const unbanBody = JSON.parse(unbanResponse.body);
    expect(unbanBody.success).toBe(true);
    expect(unbanBody.message).toContain('desbaneado');

    // Verificar que puede hacer login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.bannedUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
  });

  it('Admin puede cambiar rol de usuario', async () => {
    const token = generateAuthToken(adminId);

    // Cambiar rol a MODERATOR
    const changeRoleResponse = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${targetUserId}/role`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        role: 'MODERATOR',
      },
    });

    expect(changeRoleResponse.statusCode).toBe(200);
    const changeRoleBody = JSON.parse(changeRoleResponse.body);
    expect(changeRoleBody.success).toBe(true);

    // Verificar cambio en BD
    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    expect(updatedUser?.role).toBe('MODERATOR');
  });

  it('Admin no puede cambiar su propio rol', async () => {
    const token = generateAuthToken(adminId);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${adminId}/role`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        role: 'USER',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('propio rol');
  });

  it('Admin no puede banearse a sí mismo', async () => {
    const token = generateAuthToken(adminId);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${adminId}/ban`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        reason: 'Test',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('ti mismo');
  });

  it('Admin puede filtrar usuarios por rol', async () => {
    const token = generateAuthToken(adminId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users?role=ADMIN',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.users).toBeInstanceOf(Array);
    expect(body.data.users.every((u: any) => u.role === 'ADMIN')).toBe(true);
  });

  it('Admin puede ver reportes de actividad', async () => {
    const token = generateAuthToken(adminId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/reports?days=30',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('totalUsers');
    expect(body.data).toHaveProperty('newUsers');
    expect(body.data).toHaveProperty('activeUsers');
  });

  it('Usuario regular no puede acceder a rutas de admin', async () => {
    const regularToken = generateAuthToken(targetUserId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: {
        authorization: `Bearer ${regularToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('permisos');
  });

  it('Requiere autenticación para acceder a panel de admin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
    });

    expect(response.statusCode).toBe(401);
  });

  it('Admin puede moderar contenido', async () => {
    // Crear contenido de prueba
    const story = await prisma.story.create({
      data: {
        description: 'Contenido inapropiado',
        mediaUrl: 'https://example.com/test.jpg',
        mediaType: 'IMAGE',
        location: 'Test',
        userId: targetUserId,
      },
    });

    const token = generateAuthToken(adminId);

    // Obtener contenido para moderar
    const contentResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/content?page=1&limit=20',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(contentResponse.statusCode).toBe(200);
    const contentBody = JSON.parse(contentResponse.body);
    expect(contentBody.data.content).toBeInstanceOf(Array);

    // Eliminar contenido
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/admin/content/${story.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(deleteResponse.statusCode).toBe(200);

    // Verificar que se eliminó
    const deletedStory = await prisma.story.findUnique({
      where: { id: story.id },
    });

    expect(deletedStory).toBeNull();
  });

  it('Admin puede ver paginación correcta de usuarios', async () => {
    const token = generateAuthToken(adminId);

    // Página 1
    const page1Response = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=2',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(page1Response.statusCode).toBe(200);
    const page1Body = JSON.parse(page1Response.body);
    expect(page1Body.data.users.length).toBeLessThanOrEqual(2);
    expect(page1Body.data.pagination).toHaveProperty('page', 1);
    expect(page1Body.data.pagination).toHaveProperty('limit', 2);
    expect(page1Body.data.pagination).toHaveProperty('total');
    expect(page1Body.data.pagination).toHaveProperty('totalPages');

    // Página 2
    const page2Response = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=2&limit=2',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(page2Response.statusCode).toBe(200);
    const page2Body = JSON.parse(page2Response.body);
    expect(page2Body.data.pagination).toHaveProperty('page', 2);
  });
});
