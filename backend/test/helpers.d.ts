import { FastifyInstance } from 'fastify';
/**
 * Crea una instancia de la app de Fastify para tests
 * @returns Instancia de Fastify lista para testing
 */
export declare function createTestApp(): Promise<FastifyInstance>;
/**
 * Cierra la app de Fastify después de los tests
 * @param app Instancia de Fastify a cerrar
 */
export declare function closeTestApp(app: FastifyInstance): Promise<void>;
/**
 * Mock de usuario para tests
 */
export declare const mockUser: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    password: string;
    avatar: null;
    region: string;
    role: "USER";
    createdAt: Date;
    updatedAt: Date;
};
/**
 * Mock de token JWT para tests
 */
export declare function generateTestToken(app: FastifyInstance, payload?: any): string;
//# sourceMappingURL=helpers.d.ts.map