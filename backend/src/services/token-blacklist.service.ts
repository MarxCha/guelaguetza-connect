import { getCacheService, CacheService } from './cache.service.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface UsedTokenData {
  familyId: string;
  userId: string;
  usedAt: number; // timestamp en segundos
}

interface TokenFamilyData {
  userId: string;
  compromised: boolean;
  createdAt: number; // timestamp en segundos
  currentJti?: string; // JTI del último token válido emitido
}

// ============================================
// TOKEN BLACKLIST SERVICE
// ============================================

/**
 * TokenBlacklistService - Gestión de tokens en Redis
 *
 * Implementa token rotation y detección de token reuse attacks usando Redis.
 * Utiliza diferentes estrategias de almacenamiento según el tipo de dato.
 *
 * Estructura de claves Redis:
 * - auth:blacklist:{jti} → "1" (con TTL hasta expiración del token)
 * - auth:used:{jti} → JSON{familyId, userId, usedAt} (con TTL)
 * - auth:family:{familyId} → JSON{userId, compromised, createdAt, currentJti} (con TTL 7 días)
 * - auth:user:{userId}:families → SET de familyIds activos
 */
export class TokenBlacklistService {
  private cache: CacheService;
  private readonly PREFIX = 'auth:';
  private readonly BLACKLIST_PREFIX = 'auth:blacklist:';
  private readonly USED_PREFIX = 'auth:used:';
  private readonly FAMILY_PREFIX = 'auth:family:';
  private readonly USER_FAMILIES_PREFIX = 'auth:user:';
  private readonly FAMILY_TTL = 7 * 24 * 60 * 60; // 7 días en segundos

  constructor() {
    this.cache = getCacheService();
  }

  // ============================================
  // MÉTODOS DE BLACKLIST
  // ============================================

  /**
   * Agrega un token a la blacklist
   *
   * @param jti - JWT ID único del token
   * @param exp - Timestamp de expiración del token (segundos)
   */
  async addToBlacklist(jti: string, exp: number): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${jti}`;
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 0);

    if (ttl > 0) {
      await this.cache.set(key, '1', ttl);
    }
  }

  /**
   * Verifica si un token está en la blacklist
   *
   * @param jti - JWT ID único del token
   * @returns true si el token está en blacklist
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${jti}`;
    return await this.cache.exists(key);
  }

  // ============================================
  // MÉTODOS DE TOKEN FAMILIES
  // ============================================

  /**
   * Invalida toda una familia de tokens
   *
   * @param familyId - ID de la familia de tokens
   * @param userId - ID del usuario propietario
   */
  async invalidateFamily(familyId: string, userId: string): Promise<void> {
    const key = `${this.FAMILY_PREFIX}${familyId}`;
    const family = await this.cache.get<TokenFamilyData>(key);

    if (family) {
      // Marcar como comprometida
      family.compromised = true;
      await this.cache.set(key, family, this.FAMILY_TTL);
    } else {
      // Crear registro de familia comprometida
      const newFamily: TokenFamilyData = {
        userId,
        compromised: true,
        createdAt: Math.floor(Date.now() / 1000),
      };
      await this.cache.set(key, newFamily, this.FAMILY_TTL);
    }
  }

  /**
   * Verifica si una familia de tokens está comprometida
   *
   * @param familyId - ID de la familia de tokens
   * @returns true si la familia está comprometida
   */
  async isFamilyCompromised(familyId: string): Promise<boolean> {
    const key = `${this.FAMILY_PREFIX}${familyId}`;
    const family = await this.cache.get<TokenFamilyData>(key);
    return family?.compromised === true;
  }

  /**
   * Crea una nueva familia de tokens
   *
   * @param familyId - ID de la familia
   * @param userId - ID del usuario
   * @param jti - JTI del primer token de la familia
   */
  async createFamily(familyId: string, userId: string, jti: string): Promise<void> {
    const familyKey = `${this.FAMILY_PREFIX}${familyId}`;
    const userFamiliesKey = `${this.USER_FAMILIES_PREFIX}${userId}:families`;

    const family: TokenFamilyData = {
      userId,
      compromised: false,
      createdAt: Math.floor(Date.now() / 1000),
      currentJti: jti,
    };

    // Guardar familia
    await this.cache.set(familyKey, family, this.FAMILY_TTL);

    // Agregar a lista de familias del usuario (usando Redis SET)
    // Como CacheService no tiene soporte nativo para Sets, usamos una lista JSON
    const userFamilies = (await this.cache.get<string[]>(userFamiliesKey)) || [];
    if (!userFamilies.includes(familyId)) {
      userFamilies.push(familyId);
      await this.cache.set(userFamiliesKey, userFamilies, this.FAMILY_TTL);
    }
  }

  /**
   * Actualiza el JTI actual de una familia
   *
   * @param familyId - ID de la familia
   * @param newJti - Nuevo JTI actual
   */
  async updateFamilyJti(familyId: string, newJti: string): Promise<void> {
    const key = `${this.FAMILY_PREFIX}${familyId}`;
    const family = await this.cache.get<TokenFamilyData>(key);

    if (family) {
      family.currentJti = newJti;
      await this.cache.set(key, family, this.FAMILY_TTL);
    }
  }

  // ============================================
  // MÉTODOS DE TOKENS USADOS
  // ============================================

  /**
   * Registra que un token fue usado
   *
   * @param jti - JWT ID único del token
   * @param familyId - ID de la familia de tokens
   * @param userId - ID del usuario
   * @param exp - Timestamp de expiración del token (segundos)
   */
  async registerUsedToken(
    jti: string,
    familyId: string,
    userId: string,
    exp: number
  ): Promise<void> {
    const key = `${this.USED_PREFIX}${jti}`;
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 0);

    if (ttl > 0) {
      const data: UsedTokenData = {
        familyId,
        userId,
        usedAt: now,
      };
      await this.cache.set(key, data, ttl);
    }
  }

  /**
   * Verifica si un token ya fue usado
   *
   * @param jti - JWT ID único del token
   * @returns true si el token ya fue usado
   */
  async isTokenUsed(jti: string): Promise<boolean> {
    const key = `${this.USED_PREFIX}${jti}`;
    return await this.cache.exists(key);
  }

  /**
   * Obtiene la información de un token usado
   *
   * @param jti - JWT ID único del token
   * @returns Datos del token usado o null
   */
  async getUsedTokenInfo(jti: string): Promise<UsedTokenData | null> {
    const key = `${this.USED_PREFIX}${jti}`;
    return await this.cache.get<UsedTokenData>(key);
  }

  // ============================================
  // MÉTODOS DE LIMPIEZA Y GESTIÓN
  // ============================================

  /**
   * Invalida todas las familias de tokens de un usuario
   * Útil para "logout de todas las sesiones"
   *
   * @param userId - ID del usuario
   * @returns Número de familias invalidadas
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const userFamiliesKey = `${this.USER_FAMILIES_PREFIX}${userId}:families`;
    const familyIds = (await this.cache.get<string[]>(userFamiliesKey)) || [];

    let invalidatedCount = 0;

    for (const familyId of familyIds) {
      const familyKey = `${this.FAMILY_PREFIX}${familyId}`;
      const family = await this.cache.get<TokenFamilyData>(familyKey);

      if (family && !family.compromised) {
        family.compromised = true;
        await this.cache.set(familyKey, family, this.FAMILY_TTL);
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  /**
   * Obtiene estadísticas del servicio de tokens
   * Nota: Esta operación puede ser costosa en Redis con muchas claves
   */
  async getStats(): Promise<{
    blacklistedTokens: number;
    usedTokens: number;
    tokenFamilies: number;
  }> {
    // En producción, estas métricas deberían obtenerse de forma más eficiente
    // usando contadores incrementales en lugar de contar claves.
    // Por ahora retornamos valores por defecto para evitar operaciones costosas.
    return {
      blacklistedTokens: 0,
      usedTokens: 0,
      tokenFamilies: 0,
    };
  }

  /**
   * Limpia todos los datos de autenticación (solo para testing)
   * ADVERTENCIA: Esto invalidará todas las sesiones activas
   */
  async clearAll(): Promise<void> {
    // Invalidar todas las claves con el prefijo auth:
    await this.cache.invalidate('auth:*');
  }

  // ============================================
  // RESET TOKEN METHODS
  // ============================================

  async setResetToken(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(`auth:reset:${userId}`, tokenHash, ttlSeconds);
  }

  async getResetToken(userId: string): Promise<string | null> {
    return await this.cache.get<string>(`auth:reset:${userId}`);
  }

  async deleteResetToken(userId: string): Promise<void> {
    await this.cache.invalidate(`auth:reset:${userId}`);
  }

  /**
   * Verifica si el servicio está listo para usar
   */
  isReady(): boolean {
    return this.cache.isReady();
  }
}

// ============================================
// SINGLETON
// ============================================

let tokenBlacklistServiceInstance: TokenBlacklistService | null = null;

export function getTokenBlacklistService(): TokenBlacklistService {
  if (!tokenBlacklistServiceInstance) {
    tokenBlacklistServiceInstance = new TokenBlacklistService();
  }
  return tokenBlacklistServiceInstance;
}
