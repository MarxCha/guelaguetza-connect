import { FastifyPluginAsync } from 'fastify';
import { uploadService } from '../services/upload.service.js';
import { AppError } from '../utils/errors.js';

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/image',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const data = await request.file({
          limits: {
            fileSize: 10 * 1024 * 1024,
            files: 1,
          },
        });

        if (!data) {
          throw new AppError('No se proporcionó ningún archivo', 400);
        }

        const buffer = await data.toBuffer();
        const mimeType = data.mimetype;
        const filename = data.filename;

        const queryParams = request.query as any;
        const generateThumbnail = queryParams.generateThumbnail === 'true';
        const thumbnailWidth = queryParams.thumbnailWidth ? parseInt(queryParams.thumbnailWidth) : 300;
        const thumbnailHeight = queryParams.thumbnailHeight ? parseInt(queryParams.thumbnailHeight) : 300;

        const result = await uploadService.uploadImage(buffer, filename, mimeType, {
          generateThumbnail,
          thumbnailWidth,
          thumbnailHeight,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: error.message,
          });
        }
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Error al subir la imagen',
        });
      }
    }
  );

  fastify.delete(
    '/:key',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { key } = request.params as { key: string };

        const decodedKey = decodeURIComponent(key);

        const exists = await uploadService.fileExists(decodedKey);
        if (!exists) {
          throw new AppError('La imagen no existe', 404);
        }

        await uploadService.deleteImage(decodedKey);

        return reply.send({
          success: true,
          message: 'Imagen eliminada correctamente',
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: error.message,
          });
        }
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Error al eliminar la imagen',
        });
      }
    }
  );

  fastify.get(
    '/config',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const config = uploadService.getConfig();
      return reply.send({
        success: true,
        data: config,
      });
    }
  );
};

export default uploadRoutes;
