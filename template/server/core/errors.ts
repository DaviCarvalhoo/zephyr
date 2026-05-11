export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Não autorizado') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acesso negado') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Recurso não encontrado') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
        this.name = 'ConflictError';
    }
}
