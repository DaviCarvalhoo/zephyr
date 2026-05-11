import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    CopyObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import crypto from 'crypto';

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
    if (!_s3Client) {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION || 'us-east-1';

        if (!accessKeyId || !secretAccessKey) {
            throw new Error(
                'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
            );
        }

        _s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true
        });
    }

    return _s3Client;
}

export function getBucketName(): string {
    return process.env.S3_BUCKET || 'project-files';
}

interface CreateS3UploadOptions {
    folder?: string;
    allowedMimeTypes?: string[];
    maxFileSize?: number;
    acl?: 'private' | 'public-read';
}

const DEFAULT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export function createS3Upload(options: CreateS3UploadOptions = {}) {
    const {
        folder = 'documents',
        allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
        maxFileSize = 10 * 1024 * 1024,
        acl = 'private'
    } = options;

    const storageOptions: Parameters<typeof multerS3>[0] = {
        s3: getS3Client(),
        bucket: getBucketName(),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (_req: any, file: any, cb: any) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedBy: (_req as any).user?.id || 'unknown',
                uploadedAt: new Date().toISOString()
            });
        },
        key: (_req: any, file: any, cb: any) => {
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const ext = path.extname(file.originalname);
            const key = `${folder}/${timestamp}-${randomString}${ext}`;
            cb(null, key);
        }
    };

    if (acl === 'public-read') {
        (storageOptions as any).acl = 'public-read';
    }

    return multer({
        storage: multerS3(storageOptions),
        limits: { fileSize: maxFileSize },
        fileFilter: (_req, file, cb) => {
            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
            }
        }
    });
}

export function normalizeS3Url(url: string): string {
    if (!url) return url;

    const virtualHostedMatch = url.match(
        /https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/
    );

    if (virtualHostedMatch) {
        const [, bucket, region, key] = virtualHostedMatch;
        return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    }

    return url;
}

export function extractS3Key(url: string): string | null {
    if (!url) return null;

    const virtualHostedMatch = url.match(
        /https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\/(.+)/
    );
    if (virtualHostedMatch) return virtualHostedMatch[1];

    const pathStyleMatch = url.match(
        /https?:\/\/s3\.[^.]+\.amazonaws\.com\/[^/]+\/(.+)/
    );
    if (pathStyleMatch) return pathStyleMatch[1];

    if (!url.startsWith('http')) return url;

    return null;
}

export async function generateSignedUrl(
    key: string,
    expiresIn: number = 3600,
    options?: { filename?: string; contentType?: string }
): Promise<string> {
    const commandParams: Record<string, unknown> = {
        Bucket: getBucketName(),
        Key: key
    };

    if (options?.filename) {
        commandParams.ResponseContentDisposition =
            `attachment; filename="${encodeURIComponent(options.filename)}"`;
    }

    if (options?.contentType) {
        commandParams.ResponseContentType = options.contentType;
    }

    const command = new GetObjectCommand(commandParams as any);
    return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function downloadFromS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key
    });

    const response = await getS3Client().send(command);

    if (!response.Body) {
        throw new Error('File not found in S3');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

/**
 * Sign a PUT URL the client can upload to directly. Used by the
 * mobile backup flow — server hands out a URL scoped to the user's
 * key and steps out of the data path.
 */
export async function generatePutUrl(
    key: string,
    options: {
        expiresIn?: number;
        contentType?: string;
    } = {}
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ContentType: options.contentType ?? 'application/json'
    });
    return getSignedUrl(
        getS3Client(),
        command,
        { expiresIn: options.expiresIn ?? 600 }
    );
}

/**
 * Server-side copy + delete used by the backup promote step. The
 * staging key is moved to the canonical key in two operations; if the
 * delete fails we leave the dangling staging file (cheaper than
 * leaving the user without a backup).
 */
export async function copyS3Object(
    sourceKey: string,
    destKey: string
): Promise<void> {
    const bucket = getBucketName();
    await getS3Client().send(new CopyObjectCommand({
        Bucket: bucket,
        Key: destKey,
        CopySource: `${bucket}/${encodeURIComponent(sourceKey)}`
    }));
}

/**
 * HEAD probe — returns object metadata or null if it doesn't exist.
 * Used by /api/backup/info to surface "no backup yet" cleanly.
 */
export async function headS3Object(key: string): Promise<{
    size: number;
    lastModified: string;
} | null> {
    try {
        const res = await getS3Client().send(new HeadObjectCommand({
            Bucket: getBucketName(),
            Key: key
        }));
        return {
            size: res.ContentLength ?? 0,
            lastModified:
                res.LastModified?.toISOString()
                ?? new Date(0).toISOString()
        };
    } catch (err) {
        const code = (err as { name?: string }).name;
        if (code === 'NotFound' || code === 'NoSuchKey') {
            return null;
        }
        throw err;
    }
}

export async function deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key
    });

    await getS3Client().send(command);
}
