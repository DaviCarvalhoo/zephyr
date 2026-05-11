import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import {
    useMembers,
    useAddMember,
    useUpdateMemberRole,
    useRemoveMember,
    type Member
} from '@/hooks/queries/use-members';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    UserPlus
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
    owner: 'Proprietário',
    manager: 'Gerente',
    user: 'Usuário'
};

const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    user: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

interface AddForm {
    email: string;
    role: string;
    name: string;
    password: string;
}

const EMPTY_FORM: AddForm = { email: '', role: 'user', name: '', password: '' };
const PAGE_SIZE = 20;

export default function AccountMembersPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const confirm = useConfirm();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [editRole, setEditRole] = useState('user');
    const [form, setForm] = useState<AddForm>(EMPTY_FORM);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useMembers(accountId!, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
    });

    const addMutation = useAddMember(accountId!);
    const updateRoleMutation = useUpdateMemberRole(accountId!);
    const removeMutation = useRemoveMember(accountId!);

    const members = data?.rows || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    function openAdd() {
        setForm(EMPTY_FORM);
        setShowAddDialog(true);
    }

    function openEditRole(member: Member) {
        setEditingMember(member);
        setEditRole(member.role);
        setShowRoleDialog(true);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();

        try {
            await addMutation.mutateAsync({
                email: form.email,
                role: form.role,
                name: form.name || undefined,
                password: form.password || undefined
            });
            toast.success('Usuário adicionado');
            setShowAddDialog(false);
            setForm(EMPTY_FORM);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao adicionar usuário');
        }
    }

    async function handleUpdateRole(e: React.FormEvent) {
        e.preventDefault();
        if (!editingMember) return;

        try {
            await updateRoleMutation.mutateAsync({
                userId: editingMember.id,
                role: editRole
            });
            toast.success('Função atualizada');
            setShowRoleDialog(false);
            setEditingMember(null);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar função');
        }
    }

    async function handleRemove(member: Member) {
        const ok = await confirm({
            title: 'Remover Usuário',
            description: `Tem certeza que deseja remover "${member.name}" desta conta?`,
            confirmLabel: 'Remover',
            variant: 'destructive'
        });
        if (!ok) return;

        try {
            await removeMutation.mutateAsync(member.id);
            toast.success('Usuário removido');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao remover usuário');
        }
    }

    if (isLoading && members.length === 0) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Usuários</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {total} {total === 1 ? 'usuário' : 'usuários'}
                    </p>
                </div>
                <Button onClick={openAdd} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Usuário
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
                />
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 text-sm font-medium">Nome</th>
                            <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Email</th>
                            <th className="text-left p-3 text-sm font-medium">Função</th>
                            <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Desde</th>
                            <th className="text-right p-3 text-sm font-medium w-24">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr
                                key={member.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="p-3 text-sm">
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-muted-foreground sm:hidden text-xs">
                                            {member.email}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-3 text-sm hidden sm:table-cell text-muted-foreground">
                                    {member.email}
                                </td>
                                <td className="p-3 text-sm">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            ROLE_COLORS[member.role] || ROLE_COLORS.user
                                        }`}
                                    >
                                        {ROLE_LABELS[member.role] || member.role}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                                    {formatDate(member.utc_created_on)}
                                </td>
                                <td className="p-3 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => openEditRole(member)}
                                            className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                            title="Alterar função"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemove(member)}
                                                disabled={removeMutation.isPending}
                                                className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                                                title="Remover"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    {debouncedSearch ? (
                                        'Nenhum usuário encontrado para essa busca.'
                                    ) : (
                                        <>
                                            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            Nenhum usuário ainda. Adicione o primeiro usuário.
                                        </>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {total} {total === 1 ? 'usuário' : 'usuários'}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm tabular-nums">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add user dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Usuário</DialogTitle>
                        <DialogDescription>
                            Se o email já estiver cadastrado, o usuário será associado.
                            Caso contrário, um novo usuário será criado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Função na Conta</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="user">Usuário</option>
                                <option value="manager">Gerente</option>
                                <option value="owner">Proprietário</option>
                            </select>
                        </div>

                        <div className="rounded-lg border border-dashed p-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Os campos abaixo serão utilizados caso o usuário ainda não exista:
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Obrigatório se novo usuário"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Senha</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Mínimo 6 caracteres"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={addMutation.isPending}>
                                {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit role dialog */}
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Alterar Função</DialogTitle>
                        <DialogDescription>
                            Alterar função de {editingMember?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateRole} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Função</label>
                            <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="user">Usuário</option>
                                <option value="manager">Gerente</option>
                                <option value="owner">Proprietário</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRoleDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={updateRoleMutation.isPending}>
                                {updateRoleMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
