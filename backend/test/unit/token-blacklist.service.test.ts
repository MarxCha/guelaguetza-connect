import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenBlacklistService } from '../../src/services/token-blacklist.service.js';
import { getCacheService } from '../../src/services/cache.service.js';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  beforeEach(() => {
    service = new TokenBlacklistService();
  });

  afterEach(async () => {
    // Limpiar datos de prueba después de cada test
    await service.clearAll();
  });

  describe('Blacklist Operations', () => {
    it('should add token to blacklist with TTL', async () => {
      const jti = 'test-jti-123';
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hora

      await service.addToBlacklist(jti, exp);
      const isBlacklisted = await service.isBlacklisted(jti);

      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const jti = 'non-existent-jti';
      const isBlacklisted = await service.isBlacklisted(jti);

      expect(isBlacklisted).toBe(false);
    });

    it('should not add expired token to blacklist', async () => {
      const jti = 'expired-jti';
      const exp = Math.floor(Date.now() / 1000) - 100; // Ya expiró

      await service.addToBlacklist(jti, exp);
      const isBlacklisted = await service.isBlacklisted(jti);

      // No debería estar en blacklist porque el TTL es 0
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('Token Family Operations', () => {
    it('should create a new token family', async () => {
      const familyId = 'family-123';
      const userId = 'user-456';
      const jti = 'jti-789';

      await service.createFamily(familyId, userId, jti);

      // Verificar que no está comprometida inicialmente
      const isCompromised = await service.isFamilyCompromised(familyId);
      expect(isCompromised).toBe(false);
    });

    it('should mark family as compromised', async () => {
      const familyId = 'family-123';
      const userId = 'user-456';
      const jti = 'jti-789';

      await service.createFamily(familyId, userId, jti);
      await service.invalidateFamily(familyId, userId);

      const isCompromised = await service.isFamilyCompromised(familyId);
      expect(isCompromised).toBe(true);
    });

    it('should update family JTI', async () => {
      const familyId = 'family-123';
      const userId = 'user-456';
      const oldJti = 'jti-789';
      const newJti = 'jti-999';

      await service.createFamily(familyId, userId, oldJti);
      await service.updateFamilyJti(familyId, newJti);

      // La familia debería seguir existiendo y no comprometida
      const isCompromised = await service.isFamilyCompromised(familyId);
      expect(isCompromised).toBe(false);
    });

    it('should create compromised family even if it did not exist', async () => {
      const familyId = 'non-existent-family';
      const userId = 'user-456';

      await service.invalidateFamily(familyId, userId);

      const isCompromised = await service.isFamilyCompromised(familyId);
      expect(isCompromised).toBe(true);
    });

    it('should return false for non-existent family', async () => {
      const isCompromised = await service.isFamilyCompromised('non-existent');
      expect(isCompromised).toBe(false);
    });
  });

  describe('Used Token Operations', () => {
    it('should register a used token', async () => {
      const jti = 'used-jti-123';
      const familyId = 'family-456';
      const userId = 'user-789';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.registerUsedToken(jti, familyId, userId, exp);

      const isUsed = await service.isTokenUsed(jti);
      expect(isUsed).toBe(true);
    });

    it('should return false for unused token', async () => {
      const isUsed = await service.isTokenUsed('unused-jti');
      expect(isUsed).toBe(false);
    });

    it('should retrieve used token information', async () => {
      const jti = 'used-jti-123';
      const familyId = 'family-456';
      const userId = 'user-789';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.registerUsedToken(jti, familyId, userId, exp);

      const tokenInfo = await service.getUsedTokenInfo(jti);

      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo?.familyId).toBe(familyId);
      expect(tokenInfo?.userId).toBe(userId);
      expect(tokenInfo?.usedAt).toBeGreaterThan(0);
    });

    it('should return null for non-existent used token info', async () => {
      const tokenInfo = await service.getUsedTokenInfo('non-existent');
      expect(tokenInfo).toBeNull();
    });

    it('should not register expired used token', async () => {
      const jti = 'expired-used-jti';
      const familyId = 'family-456';
      const userId = 'user-789';
      const exp = Math.floor(Date.now() / 1000) - 100; // Ya expiró

      await service.registerUsedToken(jti, familyId, userId, exp);

      const isUsed = await service.isTokenUsed(jti);
      expect(isUsed).toBe(false);
    });
  });

  describe('User Token Revocation', () => {
    it('should revoke all user tokens', async () => {
      const userId = 'user-123';

      // Crear múltiples familias para el usuario
      await service.createFamily('family-1', userId, 'jti-1');
      await service.createFamily('family-2', userId, 'jti-2');
      await service.createFamily('family-3', userId, 'jti-3');

      // Revocar todas las familias
      const revokedCount = await service.revokeAllUserTokens(userId);

      // Verificar que todas fueron comprometidas
      expect(revokedCount).toBe(3);
      expect(await service.isFamilyCompromised('family-1')).toBe(true);
      expect(await service.isFamilyCompromised('family-2')).toBe(true);
      expect(await service.isFamilyCompromised('family-3')).toBe(true);
    });

    it('should not revoke already compromised families', async () => {
      const userId = 'user-123';

      // Crear familias
      await service.createFamily('family-1', userId, 'jti-1');
      await service.createFamily('family-2', userId, 'jti-2');

      // Comprometer una familia
      await service.invalidateFamily('family-1', userId);

      // Revocar todas las familias
      const revokedCount = await service.revokeAllUserTokens(userId);

      // Solo debería revocar la que no estaba comprometida
      expect(revokedCount).toBe(1);
    });

    it('should return 0 for user with no families', async () => {
      const revokedCount = await service.revokeAllUserTokens('non-existent-user');
      expect(revokedCount).toBe(0);
    });
  });

  describe('Service Status', () => {
    it('should report readiness based on cache service', () => {
      const cache = getCacheService();
      const expectedReady = cache.isReady();

      expect(service.isReady()).toBe(expectedReady);
    });
  });

  describe('Statistics', () => {
    it('should return stats object', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('blacklistedTokens');
      expect(stats).toHaveProperty('usedTokens');
      expect(stats).toHaveProperty('tokenFamilies');

      expect(typeof stats.blacklistedTokens).toBe('number');
      expect(typeof stats.usedTokens).toBe('number');
      expect(typeof stats.tokenFamilies).toBe('number');
    });
  });

  describe('Clear All', () => {
    it('should clear all authentication data', async () => {
      const jti = 'test-jti';
      const familyId = 'family-123';
      const userId = 'user-456';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Crear datos
      await service.addToBlacklist(jti, exp);
      await service.createFamily(familyId, userId, 'jti-789');
      await service.registerUsedToken(jti, familyId, userId, exp);

      // Limpiar todo
      await service.clearAll();

      // Verificar que todo fue eliminado
      expect(await service.isBlacklisted(jti)).toBe(false);
      expect(await service.isFamilyCompromised(familyId)).toBe(false);
      expect(await service.isTokenUsed(jti)).toBe(false);
    });
  });

  describe('Token Rotation Scenario', () => {
    it('should handle complete token rotation flow', async () => {
      const userId = 'user-123';
      const familyId = 'family-456';

      // Paso 1: Crear familia inicial
      const jti1 = 'jti-initial';
      await service.createFamily(familyId, userId, jti1);
      expect(await service.isFamilyCompromised(familyId)).toBe(false);

      // Paso 2: Primera rotación - marcar jti1 como usado y actualizar a jti2
      const jti2 = 'jti-rotation-1';
      const exp1 = Math.floor(Date.now() / 1000) + 3600;
      await service.registerUsedToken(jti1, familyId, userId, exp1);
      await service.updateFamilyJti(familyId, jti2);

      expect(await service.isTokenUsed(jti1)).toBe(true);
      expect(await service.isFamilyCompromised(familyId)).toBe(false);

      // Paso 3: Segunda rotación - marcar jti2 como usado y actualizar a jti3
      const jti3 = 'jti-rotation-2';
      const exp2 = Math.floor(Date.now() / 1000) + 3600;
      await service.registerUsedToken(jti2, familyId, userId, exp2);
      await service.updateFamilyJti(familyId, jti3);

      expect(await service.isTokenUsed(jti2)).toBe(true);
      expect(await service.isFamilyCompromised(familyId)).toBe(false);

      // Paso 4: Detección de reuse attack - se intenta usar jti1 nuevamente
      const wasUsed = await service.isTokenUsed(jti1);
      expect(wasUsed).toBe(true);

      // Invalidar familia
      await service.invalidateFamily(familyId, userId);
      expect(await service.isFamilyCompromised(familyId)).toBe(true);
    });
  });

  describe('Multiple Users Scenario', () => {
    it('should handle multiple users independently', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Usuario 1: crear familias
      await service.createFamily('family-1-1', user1, 'jti-1-1');
      await service.createFamily('family-1-2', user1, 'jti-1-2');

      // Usuario 2: crear familias
      await service.createFamily('family-2-1', user2, 'jti-2-1');
      await service.createFamily('family-2-2', user2, 'jti-2-2');

      // Revocar tokens del usuario 1
      const revokedUser1 = await service.revokeAllUserTokens(user1);
      expect(revokedUser1).toBe(2);

      // Verificar que usuario 1 está comprometido
      expect(await service.isFamilyCompromised('family-1-1')).toBe(true);
      expect(await service.isFamilyCompromised('family-1-2')).toBe(true);

      // Verificar que usuario 2 NO está comprometido
      expect(await service.isFamilyCompromised('family-2-1')).toBe(false);
      expect(await service.isFamilyCompromised('family-2-2')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string JTI', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await service.addToBlacklist('', exp);

      const isBlacklisted = await service.isBlacklisted('');
      expect(typeof isBlacklisted).toBe('boolean');
    });

    it('should handle very long JTI', async () => {
      const longJti = 'x'.repeat(1000);
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.addToBlacklist(longJti, exp);
      const isBlacklisted = await service.isBlacklisted(longJti);

      expect(isBlacklisted).toBe(true);
    });

    it('should handle special characters in IDs', async () => {
      const jti = 'jti:with:colons:123';
      const familyId = 'family-with-dashes-123';
      const userId = 'user_with_underscores_456';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.createFamily(familyId, userId, jti);
      await service.registerUsedToken(jti, familyId, userId, exp);

      expect(await service.isFamilyCompromised(familyId)).toBe(false);
      expect(await service.isTokenUsed(jti)).toBe(true);
    });
  });
});
