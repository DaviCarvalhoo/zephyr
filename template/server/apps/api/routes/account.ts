import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import demandAccountAccessMiddleware from '#shared/middlewares/demand-account-access.js';
import { buildHandler } from '#shared/utils.js';

const router = express.Router();

const updateSettingsSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    settings: z.record(z.unknown()).optional()
});

const addMemberSchema = z.object({
    email: z.string().email('Email inválido'),
    role: z.enum(['owner', 'manager', 'user']).default('user'),
    name: z.string().min(1).optional(),
    password: z.string().min(6).optional()
});

const updateMemberRoleSchema = z.object({
    role: z.enum(['owner', 'manager', 'user'])
});

async function handleGetDashboard(req: Request, res: Response): Promise<void> {
    const dashboard = await req.context.account.getAccountDashboard(
        req.accountId!
    );

    res.json({
        ok: true,
        accountId: req.accountId,
        ...dashboard
    });
}

async function handleGetSettings(req: Request, res: Response): Promise<void> {
    const account = await req.context.account.findById(req.accountId!);
    res.json({ ok: true, account });
}

async function handleUpdateSettings(req: Request, res: Response): Promise<void> {
    const data = updateSettingsSchema.parse(req.body);
    const account = await req.context.account.update(req.accountId!, data);
    res.json({ ok: true, account });
}

async function handleDeleteAccount(req: Request, res: Response): Promise<void> {
    await req.context.account.delete(req.accountId!, req.user!.id, req.accountRole!);
    res.json({ ok: true });
}

async function handleListMembers(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const result = await req.context.account.listMembers(req.accountId!, { page, limit, search });
    res.json({ ok: true, ...result });
}

async function handleAddMember(req: Request, res: Response): Promise<void> {
    const data = addMemberSchema.parse(req.body);
    const member = await req.context.account.addMember(req.accountId!, data);
    res.json({ ok: true, member });
}

async function handleUpdateMemberRole(req: Request, res: Response): Promise<void> {
    const { role } = updateMemberRoleSchema.parse(req.body);
    await req.context.account.updateMemberRole(req.accountId!, (req.params.userId as string), role);
    res.json({ ok: true });
}

async function handleRemoveMember(req: Request, res: Response): Promise<void> {
    await req.context.account.removeMember(req.accountId!, (req.params.userId as string));
    res.json({ ok: true });
}

router.get('/dashboard', buildHandler(handleGetDashboard));
router.get('/settings', buildHandler(handleGetSettings));
router.post('/settings', buildHandler(handleUpdateSettings));
router.delete('/delete', buildHandler(handleDeleteAccount));
router.get('/members', buildHandler(handleListMembers));
router.post('/members', buildHandler(handleAddMember));
router.post('/members/:userId', buildHandler(handleUpdateMemberRole));
router.delete('/members/:userId', buildHandler(handleRemoveMember));

export default function makeEndpoint(app: Express): void {
    app.use(
        '/api/account/:accountId',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        demandAccountAccessMiddleware,
        router
    );
}
