import { beforeAll, afterAll, afterEach, vi } from 'vitest';
// Mock de Prisma Client
export const prismaMock = {
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    story: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    transport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    message: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    event: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    community: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    like: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    comment: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    badge: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    userBadge: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    notification: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
};
// Mock del módulo @prisma/client
vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        constructor() {
            return prismaMock;
        }
    },
}));
// Reset de mocks después de cada test
afterEach(() => {
    vi.clearAllMocks();
});
// Setup global
beforeAll(async () => {
    // Configuración inicial si es necesaria
});
// Cleanup global
afterAll(async () => {
    // Limpieza si es necesaria
});
//# sourceMappingURL=setup.js.map