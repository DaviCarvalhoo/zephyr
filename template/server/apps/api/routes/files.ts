import type { Express, Request, Response } from 'express';
import express from 'express';
import trySetUserByTokenMiddleware from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import { buildHandler } from '#shared/utils.js';
import { createS3Upload, generateSignedUrl, extractS3Key, downloadFromS3 } from '#core/s3.js';
import { ValidationError, NotFoundError } from '#core/errors.js';

const router = express.Router();

const upload = createS3Upload({
    folder: 'uploads',
    allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
});

async function handleUpload(req: Request, res: Response): Promise<void> {
    const file = req.file as Express.MulterS3.File | undefined;

    if (!file) {
        throw new ValidationError('Nenhum arquivo enviado');
    }

    res.json({
        ok: true,
        file: {
            url: file.location,
            key: file.key,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        }
    });
}

async function handleGetSignedUrl(req: Request, res: Response): Promise<void> {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        throw new ValidationError('URL é obrigatória');
    }

    const key = extractS3Key(url);

    if (!key) {
        throw new ValidationError('URL S3 inválida');
    }

    const signedUrl = await generateSignedUrl(key, 3600);
    res.json({ ok: true, signedUrl });
}

async function handleDownload(req: Request, res: Response): Promise<void> {
    const rawKey = req.params.key;
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!key) {
        throw new ValidationError('Chave do arquivo é obrigatória');
    }

    try {
        const buffer = await downloadFromS3(key);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${key.split('/').pop()}"`
        );
        res.send(buffer);
    } catch {
        throw new NotFoundError('Arquivo não encontrado');
    }
}

router.post('/upload', upload.single('file'), buildHandler(handleUpload));
router.get('/signed-url', buildHandler(handleGetSignedUrl));
router.get('/download/:key(*)', buildHandler(handleDownload));

export default function makeEndpoint(app: Express): void {
    app.use(
        '/api/files',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        router
    );
}
