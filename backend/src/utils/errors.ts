export class AppError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode: number = 400, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Datos inválidos') {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

export class ConcurrencyError extends AppError {
  constructor(message: string = 'Conflicto de concurrencia detectado. Por favor, intenta nuevamente.') {
    super(message, 409);
    this.name = 'ConcurrencyError';
  }
}
