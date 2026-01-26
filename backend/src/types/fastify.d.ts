import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis | null;
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    file: (options?: {
      limits?: {
        fileSize?: number;
        files?: number;
      };
    }) => Promise<MultipartFile>;
  }
}
