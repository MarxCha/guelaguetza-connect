import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError } from './errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should default to 400 if no status code provided', () => {
      const error = new AppError('Server error');

      expect(error.statusCode).toBe(400);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should use default message if none provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Recurso no encontrado');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError('Invalid credentials');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should use default message if none provided', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('No autorizado');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('should use default message if none provided', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Acceso denegado');
    });
  });
});
