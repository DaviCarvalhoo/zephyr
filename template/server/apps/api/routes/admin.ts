import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import demandAdminUserMiddleware from '#shared/middlewares/demand-admin-user.js';
import { buildHandler } from '#shared/utils.js';

const router = express.Router();

const createUserSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    role: z.enum(['admin', 'user']).default('user')
});

const updateUserSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    role: z.enum(['admin', 'user']).optional(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional()
});

async function handleGetDashboard(req: Request, res: Response): Promise<void> {
    const data = await req.context.account.getDashboardStats();
    res.json({ ok: true, ...data });
}

async function handleGetAccounts(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const result = await req.context.account.list({ page, limit, search });
    res.json({ ok: true, ...result });
}

async function handleGetUsers(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const result = await req.context.user.list({ page, limit, search });
    res.json({ ok: true, ...result });
}

async function handleCreateUser(req: Request, res: Response): Promise<void> {
    const data = createUserSchema.parse(req.body);
    const user = await req.context.user.create(data);
    res.json({ ok: true, user });
}

async function handleUpdateUser(req: Request, res: Response): Promise<void> {
    const data = updateUserSchema.parse(req.body);
    const user = await req.context.user.adminUpdate((req.params.id as string), data);
    res.json({ ok: true, user });
}

async function handleDeleteUser(req: Request, res: Response): Promise<void> {
    await req.context.user.delete((req.params.id as string), req.user!.id);
    res.json({ ok: true });
}

router.get('/dashboard', buildHandler(handleGetDashboard));
router.get('/accounts', buildHandler(handleGetAccounts));
router.get('/users', buildHandler(handleGetUsers));
router.post('/users', buildHandler(handleCreateUser));
router.post('/users/:id', buildHandler(handleUpdateUser));
router.delete('/users/:id', buildHandler(handleDeleteUser));

export default function makeEndpoint(app: Express): void {
    app.use(
        '/api/admin',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        demandAdminUserMiddleware,
        router
    );
}
