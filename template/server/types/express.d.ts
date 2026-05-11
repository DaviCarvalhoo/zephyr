import type Context from '../core/context.js';

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

        namespace MulterS3 {
            interface File extends Multer.File {
                bucket: string;
                key: string;
                acl: string;
                contentType: string;
                contentDisposition: string | null;
                storageClass: string;
                serverSideEncryption: string | null;
                metadata: Record<string, string>;
                location: string;
                etag: string;
            }
        }
    }
}

export {};
