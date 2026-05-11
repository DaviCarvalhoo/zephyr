import type Context from '#core/context.js';

declare global {
    namespace Express {
        interface Request {
            context: Context;
            user?: {
                id: string;
                email: string;
                name: string;
                role: string;
                utc_created_on: string;
            };
            accountId?: string;
            accountRole?: string;
        }
    }
}

export {};
